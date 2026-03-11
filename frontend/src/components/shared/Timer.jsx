import React from 'react';

/**
 * Shared Timer component.
 * Shows a countdown bar + number.
 */
export default function Timer({ timeRemaining, timeLimit, showBar = true, size = 'normal' }) {
  if (timeLimit === 0) return null;

  const pct = Math.max(0, Math.min(100, (timeRemaining / timeLimit) * 100));
  const isWarning = pct <= 50;
  const isDanger  = pct <= 25;

  const barClass = isDanger ? 'danger' : isWarning ? 'warning' : '';
  const textClass = isDanger ? 'danger' : isWarning ? 'warning' : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
      {showBar && (
        <div className="timer-bar-container">
          <div
            className={`timer-bar ${barClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <div
        className={`timer-text ${textClass}`}
        style={size === 'large' ? { fontSize: '5rem' } : size === 'small' ? { fontSize: '2rem' } : {}}
      >
        {timeRemaining}
      </div>
    </div>
  );
}
