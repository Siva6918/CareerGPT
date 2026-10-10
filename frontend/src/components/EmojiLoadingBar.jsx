import React, { useState, useEffect } from 'react';

const barFrames = [
  "⏳⬜⬜⬜⬜",
  "🟩⏳⬜⬜⬜",
  "🟩🟩⏳⬜⬜",
  "🟩🟩🟩⏳⬜",
  "🟩🟩🟩🟩⏳",
  "🟩🟩🟩🟩🟩",
  "🟩🟩🟩🟩⏳",
  "🟩🟩🟩⏳⬜",
  "🟩🟩⏳⬜⬜",
  "🟩⏳⬜⬜⬜",
];

export default function EmojiLoadingBar({ text = "Loading..." }) {
  const [frameIdx, setFrameIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIdx(prev => (prev + 1) % barFrames.length);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '8px', letterSpacing: '4px' }}>
        {barFrames[frameIdx]}
      </div>
      <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500, margin: 0 }}>{text}</p>
    </div>
  );
}
