import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './Hand3DModal.css';

// Full skeletal structure: wrist -> each finger base, the knuckle row
// (gives the palm a webbed look), and each finger's own chain of bones.
const BONES = [
  [0, 1], [0, 5], [0, 9], [0, 13], [0, 17],
  [5, 9], [9, 13], [13, 17],
  [1, 2], [2, 3], [3, 4],
  [5, 6], [6, 7], [7, 8],
  [9, 10], [10, 11], [11, 12],
  [13, 14], [14, 15], [15, 16],
  [17, 18], [18, 19], [19, 20],
];

const JOINT_RADIUS = 0.045;
const BONE_RADIUS  = 0.032;
const SKIN_COLOR   = 0xe3a97e;
const UP_AXIS      = new THREE.Vector3(0, 1, 0);

// Landmarks store the wrist at the origin with the hand extending downward
// (+y in image space), so raw coords are not centered on anything useful.
// Convert to scene space (flip y and z) here in one place.
function toScene(lm) {
  return new THREE.Vector3(lm.x, -lm.y, -lm.z);
}

function buildHand(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const material = new THREE.MeshStandardMaterial({ color: SKIN_COLOR, roughness: 0.6 });
  const joints = Array.from({ length: 21 }, () => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(JOINT_RADIUS, 16, 16), material);
    group.add(mesh);
    return mesh;
  });
  const bones = BONES.map(() => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(BONE_RADIUS, BONE_RADIUS, 1, 12, 1), material);
    group.add(mesh);
    return mesh;
  });
  return { group, joints, bones, material };
}

// Linear interpolation between two same-shaped landmark frames — lets
// playback move continuously between captured keyframes instead of
// snapping, which is what made sparse-frame recordings (some signs have as
// few as 5-9 captured frames) look glitchy.
function lerpFrames(a, b, t) {
  return a.map((lm, i) => ({
    x: lm.x + (b[i].x - lm.x) * t,
    y: lm.y + (b[i].y - lm.y) * t,
    z: lm.z + (b[i].z - lm.z) * t,
  }));
}

function positionHand({ joints, bones }, landmarks) {
  const pts = landmarks.map(toScene);
  pts.forEach((p, i) => joints[i].position.copy(p));
  BONES.forEach(([a, b], i) => {
    const pa = pts[a];
    const pb = pts[b];
    const mesh = bones[i];
    const dir = pb.clone().sub(pa);
    const len = dir.length();
    mesh.position.copy(pa.clone().add(pb).multiplyScalar(0.5));
    mesh.scale.set(1, len, 1);
    mesh.quaternion.setFromUnitVectors(UP_AXIS, dir.normalize());
  });
}

// Bounding box across EVERY frame so the whole hand (and its full motion)
// stays framed no matter which pose is showing.
function computeFraming(frames) {
  const box = new THREE.Box3();
  for (const frame of frames) {
    for (const lm of frame) box.expandByPoint(toScene(lm));
  }
  const center = box.getCenter(new THREE.Vector3());
  const size   = box.getSize(new THREE.Vector3());
  const radius = 0.5 * Math.max(size.x, size.y, size.z) + JOINT_RADIUS;
  return { center, radius };
}

export default function Hand3DModal({ frames, fps = 15, onClose, label }) {
  const mountRef = useRef(null);
  const isMotion = frames.length > 1;

  useEffect(() => {
    const mount = mountRef.current;
    const width  = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();

    const fov = 45;
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.01, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(1.5, 2, 3);
    scene.add(dirLight);

    const hand = buildHand(scene);

    // Center the hand at the origin and pull the camera back far enough that
    // the whole bounding sphere fits within the vertical field of view.
    const { center, radius } = computeFraming(frames);
    hand.group.position.set(-center.x, -center.y, -center.z);

    const fitDistance = (radius * 1.25) / Math.sin((fov * Math.PI) / 180 / 2);
    camera.position.set(0, 0, fitDistance);
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.minDistance = radius * 0.4;
    controls.maxDistance = fitDistance * 5;
    controls.update();

    let posedOnce  = false;
    let cycleStart = null;
    const cycleDurationMs = (frames.length / fps) * 1000;
    let raf;

    function tick(now) {
      if (frames.length > 1) {
        if (cycleStart === null) cycleStart = now;
        // Map wall-clock time to a continuous (fractional) position along
        // the frame sequence, then interpolate — smooth regardless of how
        // sparse the captured keyframes are, instead of hard-cutting
        // between them every 1000/fps ms.
        const elapsed = (now - cycleStart) % cycleDurationMs;
        const virtualIdx = (elapsed / cycleDurationMs) * frames.length;
        const i = Math.floor(virtualIdx) % frames.length;
        const j = (i + 1) % frames.length;
        const t = virtualIdx - Math.floor(virtualIdx);
        positionHand(hand, lerpFrames(frames[i], frames[j], t));
      } else if (!posedOnce) {
        positionHand(hand, frames[0]);
        posedOnce = true;
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function handleResize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', handleResize);

    function handleKeydown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeydown);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeydown);
      controls.dispose();
      renderer.dispose();
      hand.material.dispose();
      hand.joints.forEach((m) => m.geometry.dispose());
      hand.bones.forEach((m) => m.geometry.dispose());
      mount.removeChild(renderer.domElement);
    };
  }, [frames, fps, onClose]);

  return (
    <div className="hand3d-overlay" onClick={onClose}>
      <div className="hand3d-panel" onClick={(e) => e.stopPropagation()}>
        <div className="hand3d-header">
          <span className="hand3d-title">{label ?? 'Hand shape'}</span>
          <button type="button" className="hand3d-close" onClick={onClose} aria-label="Close 3D view">
            ✕
          </button>
        </div>
        {isMotion && (
          <p className="hand3d-motion-notice">
            <span aria-hidden="true">🔄</span> This sign is a moving motion, not a held pose — watch it loop to see the full movement.
          </p>
        )}
        <div ref={mountRef} className="hand3d-canvas-mount" />
        <p className="hand3d-hint">Drag to rotate · Scroll to zoom · Right-drag to pan</p>
      </div>
    </div>
  );
}
