import React, { useMemo } from 'react';

export function HalloweenAmbientBackground() {
  const ambientItems = useMemo(
    () => [
      // Hojas de otoño 🍂 y 🍁 (caen suavemente con giros)
      { id: 'leaf-1', emoji: '🍂', left: '4%', size: '1.25rem', duration: '14s', delay: '0s', type: 'leaf', opacity: 0.7 },
      { id: 'leaf-2', emoji: '🍁', left: '16%', size: '1.5rem', duration: '18s', delay: '4s', type: 'leaf', opacity: 0.65 },
      { id: 'leaf-3', emoji: '🍂', left: '28%', size: '1.1rem', duration: '12s', delay: '8s', type: 'leaf', opacity: 0.6 },
      { id: 'leaf-4', emoji: '🍁', left: '45%', size: '1.4rem', duration: '16s', delay: '2s', type: 'leaf', opacity: 0.7 },
      { id: 'leaf-5', emoji: '🍂', left: '62%', size: '1.3rem', duration: '15s', delay: '6s', type: 'leaf', opacity: 0.65 },
      { id: 'leaf-6', emoji: '🍁', left: '78%', size: '1.6rem', duration: '19s', delay: '1s', type: 'leaf', opacity: 0.7 },
      { id: 'leaf-7', emoji: '🍂', left: '92%', size: '1.2rem', duration: '13s', delay: '7s', type: 'leaf', opacity: 0.65 },
      { id: 'leaf-8', emoji: '🌰', left: '38%', size: '1rem', duration: '17s', delay: '10s', type: 'leaf', opacity: 0.5 },
      { id: 'leaf-9', emoji: '🍂', left: '85%', size: '1.35rem', duration: '14s', delay: '11s', type: 'leaf', opacity: 0.6 },

      // Fantasmitas 👻 y calabazas flotantes (ascienden con aura mística)
      { id: 'ghost-1', emoji: '👻', left: '9%', size: '1.75rem', duration: '20s', delay: '1s', type: 'ghost', opacity: 0.75 },
      { id: 'ghost-2', emoji: '👻', left: '33%', size: '1.5rem', duration: '24s', delay: '9s', type: 'ghost', opacity: 0.65 },
      { id: 'ghost-3', emoji: '👻', left: '70%', size: '2rem', duration: '22s', delay: '4s', type: 'ghost', opacity: 0.8 },
      { id: 'ghost-4', emoji: '👻', left: '88%', size: '1.4rem', duration: '26s', delay: '14s', type: 'ghost', opacity: 0.7 },
      { id: 'pumpkin-1', emoji: '🎃', left: '53%', size: '1.3rem', duration: '21s', delay: '12s', type: 'leaf', opacity: 0.55 },
    ],
    []
  );

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
      style={{ isolation: 'isolate' }}
    >
      {ambientItems.map((item) => (
        <span
          key={item.id}
          className={item.type === 'ghost' ? 'ambient-ghost' : 'ambient-leaf'}
          style={{
            left: item.left,
            fontSize: item.size,
            animationDuration: item.duration,
            animationDelay: item.delay,
            opacity: item.opacity,
          }}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  );
}
