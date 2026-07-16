import { Suspense, lazy, useState } from 'react';
import { createPortal } from 'react-dom';
import './ExpandableHandPreview.css';

// three.js is a heavy dependency (~250kB gzipped) — only fetch it once the
// user actually opens the 3D view, not on initial page load.
const Hand3DModal = lazy(() => import('./Hand3DModal.jsx'));

export default function ExpandableHandPreview({ frames, fps, label }) {
  const [open, setOpen] = useState(false);
  const isMotion = frames.length > 1;

  return (
    <>
      <button
        type="button"
        className="expandable-hand-trigger"
        onClick={() => setOpen(true)}
        aria-label={
          isMotion
            ? `View ${label ?? 'hand shape'} in 3D — this sign is a moving animation`
            : `View ${label ?? 'hand shape'} in 3D`
        }
      >
        <span className="expandable-hand-icon" aria-hidden="true">{isMotion ? '🔄' : '🖐️'}</span>
        <span className="expandable-hand-label">
          {isMotion ? 'View 3D hand (animated)' : 'View 3D hand'}
        </span>
      </button>
      {open &&
        createPortal(
          <Suspense fallback={<div className="hand3d-loading-overlay">Loading 3D viewer…</div>}>
            <Hand3DModal frames={frames} fps={fps} label={label} onClose={() => setOpen(false)} />
          </Suspense>,
          document.body,
        )}
    </>
  );
}
