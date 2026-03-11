import React from 'react';

export default function LandingPage({ onHostClick, onPlayerClick, onAdminClick, isConnected }) {
  return (
    <div className="screen-centered fade-in" style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a3e 100%)' }}>
      {/* Background decoration */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0
      }}>
        {['▲','◆','●','■'].map((shape, i) => (
          <div key={i} style={{
            position: 'absolute',
            fontSize: `${80 + i * 30}px`,
            opacity: 0.04,
            top: `${10 + i * 20}%`,
            left: `${5 + i * 22}%`,
            transform: `rotate(${i * 15}deg)`,
            color: ['#e74c3c','#2980b9','#e67e22','#27ae60'][i],
          }}>{shape}</div>
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', maxWidth: '480px', width: '100%', padding: '20px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '8px' }}>🎮</div>
          <h1 style={{ background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '12px' }}>
            Sabnaya
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem', fontWeight: 600 }}>
            Real-time multiplayer trivia — play with friends!
          </p>
        </div>

        {/* Connection indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: isConnected ? 'var(--success)' : 'var(--danger)',
            boxShadow: isConnected ? '0 0 8px var(--success)' : 'none',
          }} />
          <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 600 }}>
            {isConnected ? 'Connected to server' : 'Connecting…'}
          </span>
        </div>

        {/* Action cards */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={onHostClick}
            disabled={!isConnected}
            style={{
              background: 'linear-gradient(135deg, var(--purple), #4f46e5)',
              fontSize: '1.25rem',
              padding: '22px 28px',
              borderRadius: '18px',
              boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
            }}
          >
            <span style={{ fontSize: '1.6rem' }}>🎯</span>
            Host a Game
          </button>

          <button
            className="btn btn-secondary btn-lg btn-full"
            onClick={onPlayerClick}
            disabled={!isConnected}
            style={{
              background: 'var(--surface)',
              fontSize: '1.25rem',
              padding: '22px 28px',
              borderRadius: '18px',
              border: '2px solid rgba(255,255,255,0.12)',
            }}
          >
            <span style={{ fontSize: '1.6rem' }}>🙋</span>
            Join a Game
          </button>

          <button
            className="btn btn-secondary btn-full"
            onClick={onAdminClick}
            style={{
              fontSize: '0.95rem', padding: '14px 20px',
              borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-dim)',
            }}
          >
            <span>🎛️</span> Admin Panel
          </button>
        </div>

        {/* How to play */}
        <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '20px', width: '100%', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h4 style={{ marginBottom: '12px', color: 'var(--purple-light)' }}>⚡ How it works</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              ['🎯', 'Host creates a game and gets a PIN'],
              ['📱', 'Players join on any device using the PIN'],
              ['🎨', 'Players tap colored answer tiles'],
              ['🏆', 'Score fast = earn more points!'],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                <span>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 600, opacity: 0.5 }}>
          Built with React + Node.js + Socket.IO
        </p>
      </div>
    </div>
  );
}
