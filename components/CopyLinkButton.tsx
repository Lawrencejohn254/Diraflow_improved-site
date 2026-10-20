'use client';
import { useState } from 'react';

export default function CopyLinkButton() {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="share-btn"
      title="Copy link"
      onClick={async () => {
        try { await navigator.clipboard.writeText(window.location.href); setDone(true); setTimeout(() => setDone(false), 1800); } catch { /* clipboard unavailable */ }
      }}
    >
      {done ? '✓' : '🔗'}
    </button>
  );
}
