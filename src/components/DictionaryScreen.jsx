import { useMemo, useState } from 'react';
import SkeletonReplay from './SkeletonReplay.jsx';
import ExpandableHandPreview from './ExpandableHandPreview.jsx';
import RevealGroup from './motion/RevealGroup.jsx';
import { getAllSigns } from '../data/signLoader.js';
import { MOTION_FPS } from '../config.js';
import './DictionaryScreen.css';

function framesFor(sign) {
  return sign.type === 'motion' ? sign.frames : [sign.landmarks];
}

export default function DictionaryScreen() {
  const [query, setQuery] = useState('');
  const allSigns = useMemo(() => getAllSigns(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allSigns;
    return allSigns.filter((s) => s.name.toLowerCase().includes(q));
  }, [allSigns, query]);

  return (
    <div className="screen dictionary-screen">
      <h2 className="tab-title">Dictionary</h2>
      <p className="tab-sub">Look up any sign you've learned so far — {allSigns.length} signs.</p>

      <input
        type="search"
        className="dict-search"
        placeholder="Search a sign…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search the sign dictionary"
      />

      {filtered.length === 0 ? (
        <p className="dict-empty">No signs match &ldquo;{query}&rdquo;.</p>
      ) : (
        <RevealGroup className="dict-grid" stagger={0.03} as="div">
          {filtered.map((sign) => (
            <RevealGroup.Item key={sign.id} as="div" className="dict-card">
              <SkeletonReplay frames={framesFor(sign)} fps={sign.fps ?? MOTION_FPS} size={120} />
              <b className="dict-card-name">{sign.name}</b>
              {sign.description && <p className="dict-card-desc">{sign.description}</p>}
              <ExpandableHandPreview
                frames={framesFor(sign)}
                fps={sign.fps ?? MOTION_FPS}
                label={sign.name}
              />
            </RevealGroup.Item>
          ))}
        </RevealGroup>
      )}
    </div>
  );
}
