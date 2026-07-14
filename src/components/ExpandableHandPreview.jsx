import { Suspense, lazy, useState } from 'react';
import { createPortal } from 'react-dom';
import './ExpandableHandPreview.css';

// three.js is a heavy dependency (~250kB gzipped) — only fetch it once the
// user actually opens the 3D view, not on initial page load.
const Hand3DModal = lazy(() => import('./Hand3DModal.jsx'));

export default function ExpandableHandPreview({ frames, fps, label }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="expandable-hand-trigger"
        onClick={() => setOpen(true)}
        aria-label={`View ${label ?? 'hand shape'} in 3D`}
      >
        <span className="expandable-hand-icon" aria-hidden="true">🖐️</span>
        <span className="expandable-hand-label">View 3D hand</span>
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
