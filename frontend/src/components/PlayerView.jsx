import React, { useState, useEffect } from 'react';
import Timer from './shared/Timer';
import Leaderboard from './shared/Leaderboard';

// Answer tile config — same colors & shapes as host (accessibility: color + shape)
const TILE_SHAPES  = ['▲', '◆', '●', '■'];
const TILE_NAMES   = ['Triangle', 'Diamond', 'Circle', 'Square'];
const TILE_COLORS  = ['#e74c3c', '#2980b9', '#e67e22', '#27ae60'];

// ─────────────────────────────────────────────────────────────
// Join Screen
// ─────────────────────────────────────────────────────────────
function JoinScreen({ onJoin, onBack, error }) {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');

  // Auto-fill room code from URL param ?join=XXXX
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    if (code) setRoomCode(code.toUpperCase());
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (roomCode.trim().length < 4 || !playerName.trim()) return;
    onJoin(roomCode.trim().toUpperCase(), playerName.trim());
  };

  return (
    <div className="screen-centered fade-in">
      <div className="card">
        <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '20px' }}>
          ← Back
        </button>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🙋</div>
          <h2>Join a Game</h2>
          <p style={{ color: 'var(--text-dim)', fontWeight: 600, marginTop: '6px' }}>
            Enter the Game PIN your host shared
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Game PIN</label>
            <input
              className="input input-lg"
              placeholder="ENTER PIN"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              maxLength={6}
              autoFocus
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input
              className="input"
              placeholder="Enter your display name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
              maxLength={20}
              autoComplete="off"
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              padding: '12px 16px',
              borderRadius: 'var(--radius)',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={roomCode.trim().length < 4 || !playerName.trim()}
          >
            Let's Play! 🎮
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Waiting Room (joined, waiting for host to start)
// ─────────────────────────────────────────────────────────────
function PlayerWaitingRoom({ playerName, roomCode }) {
  return (
    <div className="screen-centered fade-in" style={{ background: 'linear-gradient(160deg, #0f0f1a, #1a1a3e)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', textAlign: 'center', padding: '20px' }}>
        <div className="badge badge-green">✓ Joined</div>
        <div style={{ fontSize: '3rem' }}>👋</div>
        <h2>You're in!</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ color: 'var(--text-dim)', fontWeight: 700 }}>Playing as</div>
          <div style={{
            background: 'var(--purple)',
            padding: '10px 24px',
            borderRadius: '999px',
            fontWeight: 900,
            fontSize: '1.3rem',
          }}>
            {playerName}
          </div>
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 600 }}>
          Game PIN: <strong style={{ color: 'white' }}>{roomCode}</strong>
        </div>
        <div className="waiting-state">
          <div className="spinner" />
          <p style={{ color: 'var(--text-dim)', fontWeight: 600 }}>
            Waiting for the host to start the game…
          </p>
        </div>

        {/* Sneak peek of answer tiles */}
        <div style={{ width: '100%', maxWidth: '320px', opacity: 0.3 }}>
          <div className="answer-grid">
            {TILE_SHAPES.map((shape, i) => (
              <div key={i} className={`answer-tile tile-${i}`} style={{ minHeight: '70px', cursor: 'default', pointerEvents: 'none' }}>
                <span className="tile-shape">{shape}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Answer Screen (the core player gameplay screen)
// ─────────────────────────────────────────────────────────────
const STREAK_MSGS = ['', '', '🔥 On Fire!', '🔥🔥 Blazing!', '⚡ Unstoppable!'];

function PlayerAnswerScreen({ playerData, onSubmit }) {
  const { questionData, timeRemaining, myAnswer, answerLocked, currentStreak = 0 } = playerData;
  if (!questionData) return null;

  const hasAnswered = myAnswer !== null;
  const streakTier = Math.min(currentStreak, STREAK_MSGS.length - 1);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0f0f1a, #1a1a3e)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        background: 'rgba(0,0,0,0.3)',
        flexShrink: 0,
      }}>
        <div style={{ color: 'var(--text-dim)', fontWeight: 700, fontSize: '0.9rem' }}>
          Q{questionData.questionIndex + 1} / {questionData.totalQuestions}
        </div>
        <Timer
          timeRemaining={timeRemaining}
          timeLimit={questionData.timeLimit}
          showBar={false}
          size="small"
        />
        <div style={{ width: '60px' }} /> {/* spacer */}
      </div>

      {/* Timer bar */}
      <div style={{ padding: '0 16px', flexShrink: 0 }}>
        <Timer
          timeRemaining={timeRemaining}
          timeLimit={questionData.timeLimit}
          showBar={true}
          size="small"
        />
      </div>

      {/* Streak badge */}
      {currentStreak >= 2 && (
        <div style={{
          textAlign: 'center', padding: '8px 20px',
          background: 'rgba(124,45,0,0.4)', border: '2px solid #f97316',
          borderRadius: '999px', margin: '0 16px',
          fontWeight: 900, fontSize: '1rem', color: '#fed7aa',
          animation: 'bannerIn 0.4s ease',
          flexShrink: 0,
        }}>
          {STREAK_MSGS[streakTier] || `🔥 ×${currentStreak} streak`}
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px' }}>
        {!hasAnswered ? (
          <>
            {/* Instruction */}
            <div style={{
              textAlign: 'center',
              padding: '14px',
              background: 'var(--surface)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-dim)',
              fontWeight: 700,
              fontSize: '1rem',
            }}>
              🎯 Choose your answer!
            </div>

            {/* Answer tiles */}
            <div className="answer-grid" style={{ flex: 1 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <button
                  key={i}
                  className={`answer-tile tile-${i}`}
                  onClick={() => !answerLocked && onSubmit(i)}
                  disabled={answerLocked}
                  style={{ minHeight: '120px', cursor: answerLocked ? 'not-allowed' : 'pointer' }}
                >
                  <span className="tile-shape" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}>
                    {TILE_SHAPES[i]}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Submitted state */
          <div className="waiting-state" style={{ flex: 1, justifyContent: 'center' }}>
            <div style={{ fontSize: '4rem' }}>
              {TILE_SHAPES[myAnswer]}
            </div>
            <div style={{
              background: TILE_COLORS[myAnswer],
              color: 'white',
              padding: '12px 28px',
              borderRadius: '999px',
              fontWeight: 900,
              fontSize: '1.1rem',
            }}>
              {TILE_NAMES[myAnswer]} selected
            </div>
            <div className="spinner" />
            <p style={{ color: 'var(--text-dim)', fontWeight: 600 }}>
              Answer locked in! Waiting for results…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Result Screen (player sees if they were right + points)
// ─────────────────────────────────────────────────────────────
function PlayerResultScreen({ playerData }) {
  const { roundResult } = playerData;
  if (!roundResult) return null;

  const { isCorrect, points = 0, speedBonus = 0, streakBonus = 0, streakTier = 0,
          newStreak = 0, totalScore, correctAnswerIndex, yourAnswerIndex } = roundResult;
  const pointsEarned = points;
  const noAnswer = yourAnswerIndex === null || yourAnswerIndex === undefined;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0f0f1a, #1a1a3e)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 20px',
      gap: '24px',
    }}>
      {/* Result banner */}
      <div
        className={`result-banner ${noAnswer ? 'no-answer' : isCorrect ? 'correct' : 'wrong'}`}
        style={{ width: '100%', maxWidth: '400px' }}
      >
        <div style={{ fontSize: '3rem' }}>
          {noAnswer ? '⏰' : isCorrect ? '✅' : '❌'}
        </div>
        <div style={{ fontSize: '1.6rem' }}>
          {noAnswer ? "Time's Up!" : isCorrect ? 'Correct!' : 'Wrong!'}
        </div>
        {!noAnswer && (
          <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>
            +{pointsEarned.toLocaleString()} pts
          </div>
        )}
      </div>

      {/* Answer tiles reveal */}
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div className="answer-grid">
          {Array.from({ length: 4 }).map((_, i) => {
            const isCorrectTile = i === correctAnswerIndex;
            const isMyTile = i === yourAnswerIndex;
            let tileClass = '';
            if (isCorrectTile) tileClass = 'correct';
            else if (isMyTile && !isCorrect) tileClass = 'wrong';
            else tileClass = 'wrong';

            return (
              <div
                key={i}
                className={`answer-tile tile-${i} ${tileClass}`}
                style={{ cursor: 'default', minHeight: '80px', position: 'relative' }}
              >
                <span className="tile-shape">{TILE_SHAPES[i]}</span>
                {isCorrectTile && <span style={{ fontSize: '1.3rem' }}>✓</span>}
                {isMyTile && !isCorrect && <span style={{ fontSize: '1.3rem' }}>✗</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Points breakdown */}
      {isCorrect && !noAnswer && (
        <div style={{ width: '100%', maxWidth: '400px', background: 'var(--surface)', borderRadius: '16px', padding: '16px 20px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dim)' }}>
            <span>Base points</span><span style={{ color: 'var(--white)' }}>+{(pointsEarned - speedBonus - streakBonus).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dim)' }}>
            <span>Speed bonus</span><span style={{ color: 'var(--white)' }}>+{speedBonus.toLocaleString()}</span>
          </div>
          {streakBonus > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 800, color: 'var(--warning)' }}>
              <span>🔥 Streak ×{newStreak}</span><span>+{streakBonus}</span>
            </div>
          )}
        </div>
      )}

      {/* Score */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: '16px',
        padding: '20px 32px',
        textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.06)',
        width: '100%',
        maxWidth: '300px',
      }}>
        <div style={{ color: 'var(--text-dim)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>
          TOTAL SCORE
        </div>
        <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--purple-light)' }}>
          {totalScore.toLocaleString()}
        </div>
      </div>

      {/* Waiting for host */}
      <div className="waiting-state">
        <div className="spinner" />
        <p style={{ color: 'var(--text-dim)', fontWeight: 600 }}>
          Waiting for the next question…
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Leaderboard Screen (between questions)
// ─────────────────────────────────────────────────────────────
function PlayerLeaderboardScreen({ playerData }) {
  const { leaderboard, playerName, playerData: pd } = playerData;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0f0f1a, #1a1a3e)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px',
      gap: '20px',
    }}>
      <h2 style={{ textAlign: 'center' }}>🏆 Leaderboard</h2>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <Leaderboard entries={leaderboard} highlightName={playerName} />
      </div>
      <div className="waiting-state">
        <div className="spinner" />
        <p style={{ color: 'var(--text-dim)', fontWeight: 600 }}>
          Waiting for next question…
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Final Screen
// ─────────────────────────────────────────────────────────────
function PlayerFinalScreen({ playerData, onPlayAgain }) {
  const { finalLeaderboard, playerName, currentScore } = playerData;
  const myRank = finalLeaderboard.findIndex((e) => e.name === playerName) + 1;
  const podium = finalLeaderboard.slice(0, 3);
  const podiumClasses = ['podium-2nd', 'podium-1st', 'podium-3rd'];
  const podiumEmoji = ['🥈', '🥇', '🥉'];
  const ordered = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0f0f1a, #1a0a3e)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '28px 16px',
      gap: '24px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '4px' }}>🏁</div>
        <h2 style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Game Over!
        </h2>
      </div>

      {/* My result */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: '20px',
        padding: '20px 28px',
        textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.08)',
        width: '100%',
        maxWidth: '380px',
      }}>
        <div style={{ color: 'var(--text-dim)', fontWeight: 700, marginBottom: '4px', fontSize: '0.85rem' }}>YOUR RESULT</div>
        <div style={{ fontWeight: 900, fontSize: '1.2rem', marginBottom: '8px' }}>{playerName}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
          <div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 700 }}>RANK</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>
              {myRank <= 3 ? podiumEmoji[myRank - 1] : `#${myRank}`}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 700 }}>SCORE</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--purple-light)' }}>
              {currentScore.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Mini podium */}
      {podium.length >= 1 && (
        <div className="podium" style={{ maxWidth: '320px', width: '100%' }}>
          {ordered.map((entry, i) => {
            if (!entry) return <div key={i} style={{ flex: 1 }} />;
            return (
              <div key={entry.socketId || entry.name} className={`podium-place ${podiumClasses[i]}`}>
                <div className="podium-avatar">{podiumEmoji[i]}</div>
                <div className="podium-name" style={{ fontSize: '0.8rem' }}>{entry.name}</div>
                <div className="podium-block" style={{ fontSize: '1.5rem' }}>{podiumEmoji[i]}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full leaderboard */}
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <Leaderboard entries={finalLeaderboard} highlightName={playerName} />
      </div>

      <button className="btn btn-primary btn-lg" onClick={onPlayAgain}>
        🎮 Play Again
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PlayerView — main container that routes between player screens
// ─────────────────────────────────────────────────────────────
export default function PlayerView({ state, actions }) {
  const { gamePhase, roomCode, playerData, error } = state;

  // Not yet joined
  if (!roomCode) {
    return (
      <JoinScreen
        onJoin={actions.joinRoom}
        onBack={actions.reset}
        error={error}
      />
    );
  }

  // Lobby
  if (gamePhase === 'lobby') {
    return (
      <PlayerWaitingRoom
        playerName={playerData.playerName}
        roomCode={roomCode}
      />
    );
  }

  // Active question
  if (gamePhase === 'question') {
    return (
      <PlayerAnswerScreen
        playerData={playerData}
        onSubmit={actions.submitAnswer}
      />
    );
  }

  // Answer reveal
  if (gamePhase === 'reveal') {
    return (
      <PlayerResultScreen
        playerData={playerData}
      />
    );
  }

  // Leaderboard between questions
  if (gamePhase === 'leaderboard') {
    return (
      <PlayerLeaderboardScreen
        playerData={{ ...playerData, playerName: playerData.playerName }}
      />
    );
  }

  // Game finished
  if (gamePhase === 'finished') {
    return (
      <PlayerFinalScreen
        playerData={playerData}
        onPlayAgain={actions.reset}
      />
    );
  }

  // Fallback spinner
  return (
    <div className="screen-centered">
      <div className="spinner" />
    </div>
  );
}
