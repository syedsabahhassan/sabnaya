import React from 'react';

const RANK_EMOJI = ['🥇', '🥈', '🥉'];

/**
 * Reusable leaderboard component.
 * Shows top N players with rank, name, and score.
 */
export default function Leaderboard({ entries = [], highlightName = null, maxRows = 8 }) {
  const visible = entries.slice(0, maxRows);

  if (!visible.length) {
    return (
      <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '20px', fontWeight: 600 }}>
        No scores yet
      </div>
    );
  }

  return (
    <div className="leaderboard fade-in">
      {visible.map((entry, i) => {
        const isHighlighted = highlightName && entry.name === highlightName;
        const topClass = i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';

        return (
          <div
            key={entry.socketId || entry.name}
            className={`leaderboard-row ${topClass}`}
            style={{
              outline: isHighlighted ? '2px solid var(--purple-light)' : 'none',
              animationDelay: `${i * 0.05}s`,
            }}
          >
            <div className="leaderboard-rank">
              {i < 3 ? RANK_EMOJI[i] : `#${i + 1}`}
            </div>
            <div className="leaderboard-name">
              {entry.name}
              {isHighlighted && (
                <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--purple-light)', fontWeight: 700 }}>
                  (you)
                </span>
              )}
            </div>
            <div className="leaderboard-score">
              {(entry.score || 0).toLocaleString()} pts
            </div>
          </div>
        );
      })}
    </div>
  );
}
