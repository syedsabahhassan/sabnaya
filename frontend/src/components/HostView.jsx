import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Timer from './shared/Timer';
import Leaderboard from './shared/Leaderboard';

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// Answer tile config — colors + shapes for accessibility
const TILE_SHAPES  = ['▲', '◆', '●', '■'];
const TILE_LABELS  = ['Triangle', 'Diamond', 'Circle', 'Square'];
const TILE_COLORS  = ['var(--answer-red)', 'var(--answer-blue)', 'var(--answer-yellow)', 'var(--answer-green)'];

// ─────────────────────────────────────────────────────────────
// Lobby Screen (host waiting for players)
// ─────────────────────────────────────────────────────────────
function HostLobby({ roomCode, hostData, onStart, onBack }) {
  const joinUrl = `${window.location.origin}?join=${roomCode}`;
  const playerCount = hostData.players.length;

  return (
    <div className="screen" style={{ background: 'linear-gradient(160deg, #0f0f1a 0%, #1a0a3e 100%)', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: '700px', padding: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
          <div className="badge badge-purple">🎯 Host</div>
          <div style={{ marginLeft: 'auto', color: 'var(--text-dim)', fontWeight: 700, fontSize: '0.9rem' }}>
            {hostData.quizTitle}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* PIN display */}
          <div style={{ flex: '1 1 280px' }}>
            <div className="pin-display" style={{ marginBottom: '20px' }}>
              <div className="pin-label">Game PIN</div>
              <div className="pin-code">{roomCode}</div>
              <div style={{ marginTop: '8px', color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 600 }}>
                Go to <strong style={{ color: 'white' }}>{window.location.host}</strong> and enter this PIN
              </div>
            </div>

            {/* QR Code */}
            <div className="qr-section" style={{ margin: '0 auto', width: 'fit-content' }}>
              <QRCodeSVG value={joinUrl} size={140} bgColor="#ffffff" fgColor="#1a1a2e" />
              <div className="qr-label">Scan to join</div>
            </div>
          </div>

          {/* Players joined */}
          <div style={{ flex: '1 1 280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3>Players Joined</h3>
              <div className="badge badge-green">
                {playerCount} {playerCount === 1 ? 'player' : 'players'}
              </div>
            </div>

            <div style={{
              minHeight: '180px',
              background: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '8px',
              marginBottom: '20px',
            }}>
              {playerCount === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px', color: 'var(--text-dim)', fontWeight: 600 }}>
                  Waiting for players to join…
                </div>
              ) : (
                <div className="player-chips">
                  {hostData.players.map((p) => (
                    <div key={p.socketId} className="player-chip">
                      <div className="dot" />
                      {p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
                Quiz: <strong style={{ color: 'white' }}>{hostData.quizTitle}</strong> · {hostData.questionCount} questions
              </div>
              <button
                className="btn btn-success btn-lg btn-full"
                onClick={onStart}
                disabled={playerCount === 0}
              >
                {playerCount === 0 ? '⏳ Waiting for players…' : `🚀 Start Game (${playerCount} players)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Question Screen (host sees question + answers + timer)
// ─────────────────────────────────────────────────────────────
function HostQuestion({ hostData, onEndEarly }) {
  const { currentQuestion, timeRemaining, answeredCount, totalPlayers } = hostData;
  if (!currentQuestion) return null;

  const progress = totalPlayers > 0 ? (answeredCount / totalPlayers) * 100 : 0;

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
        padding: '16px 24px',
        background: 'rgba(0,0,0,0.3)',
        flexShrink: 0,
      }}>
        <div className="stat-chips">
          <div className="stat-chip">
            📝 Q{currentQuestion.questionIndex + 1}/{currentQuestion.totalQuestions}
          </div>
          <div className="stat-chip">
            ✅ {answeredCount}/{totalPlayers} answered
          </div>
        </div>
        <Timer
          timeRemaining={timeRemaining}
          timeLimit={currentQuestion.timeLimit}
          showBar={false}
          size="small"
        />
        <button className="btn btn-secondary btn-sm" onClick={onEndEarly}>
          End Early
        </button>
      </div>

      {/* Timer bar */}
      <div style={{ padding: '0 24px', flexShrink: 0 }}>
        <Timer
          timeRemaining={timeRemaining}
          timeLimit={currentQuestion.timeLimit}
          showBar={true}
          size="small"
        />
      </div>

      {/* Question text + optional image */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', gap: '24px' }}>
        <div style={{
          background: 'var(--surface)',
          borderRadius: '20px',
          padding: '24px 32px',
          textAlign: 'center',
          boxShadow: 'var(--shadow)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {currentQuestion.imageUrl && (
            <img
              src={currentQuestion.imageUrl}
              alt="Question"
              style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '12px', marginBottom: '16px', objectFit: 'contain' }}
            />
          )}
          <h2 style={{ fontSize: 'clamp(1.3rem, 3.5vw, 2.2rem)', lineHeight: 1.3 }}>
            {currentQuestion.questionText}
          </h2>
          {currentQuestion.pointsBase && currentQuestion.pointsBase !== 500 && (
            <div className="badge badge-yellow" style={{ marginTop: '10px', display: 'inline-flex' }}>
              ⭐ {currentQuestion.pointsBase} base pts
            </div>
          )}
        </div>

        {/* Answer tiles (host sees labels) */}
        <div className="answer-grid" style={{ flex: 1 }}>
          {currentQuestion.answers.map((answer, i) => (
            <div
              key={i}
              className={`answer-tile tile-${i}`}
              style={{ cursor: 'default', minHeight: '100px' }}
            >
              <span className="tile-shape">{TILE_SHAPES[i]}</span>
              <span className="tile-label">{answer.text}</span>
            </div>
          ))}
        </div>

        {/* Answer progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 700 }}>
            <span>Answers received</span>
            <span>{answeredCount} / {totalPlayers}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Reveal Screen (host sees correct answer + round stats)
// ─────────────────────────────────────────────────────────────
function HostReveal({ hostData, onNext, isLastQuestion }) {
  const { roundResult, currentQuestion } = hostData;
  if (!roundResult || !currentQuestion) return null;

  const { correctAnswerIndex, roundTopScorer, totalAnswered, totalPlayers, leaderboard } = roundResult;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0f0f1a, #14002e)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      gap: '20px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="badge badge-purple" style={{ marginBottom: '12px' }}>Answer Reveal</div>
        <h2 style={{ marginBottom: '8px' }}>Q{currentQuestion.questionIndex + 1}: {currentQuestion.questionText}</h2>
      </div>

      {/* Answers with correct one highlighted */}
      <div className="answer-grid">
        {currentQuestion.answers.map((answer, i) => (
          <div
            key={i}
            className={`answer-tile tile-${i} ${i === correctAnswerIndex ? 'correct' : 'wrong'}`}
            style={{ cursor: 'default', minHeight: '80px' }}
          >
            <span className="tile-shape">{TILE_SHAPES[i]}</span>
            <span className="tile-label">{answer.text}</span>
            {i === correctAnswerIndex && (
              <span style={{ fontSize: '1.5rem' }}>✓</span>
            )}
          </div>
        ))}
      </div>

      {/* Round stats */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div className="stat-chip">
          ✅ {totalAnswered}/{totalPlayers} answered
        </div>
        {roundTopScorer && (
          <div className="stat-chip" style={{ background: 'rgba(124,58,237,0.3)', color: 'var(--purple-light)' }}>
            ⚡ Fastest correct: {roundTopScorer.name} (+{roundTopScorer.pointsEarned})
          </div>
        )}
      </div>

      {/* Leaderboard preview */}
      <div>
        <h4 style={{ marginBottom: '12px', textAlign: 'center' }}>🏆 Current Standings</h4>
        <Leaderboard entries={leaderboard} maxRows={5} />
      </div>

      <button
        className="btn btn-primary btn-lg btn-full"
        onClick={onNext}
        style={{ marginTop: 'auto' }}
      >
        {isLastQuestion ? '🏁 Show Final Results' : '⏭ Next Question'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Final Podium Screen
// ─────────────────────────────────────────────────────────────
function HostPodium({ finalLeaderboard, onPlayAgain }) {
  const podium = finalLeaderboard.slice(0, 3);
  // Reorder to: 2nd, 1st, 3rd for visual podium layout
  const ordered = [podium[1], podium[0], podium[2]].filter(Boolean);
  const podiumClasses = ['podium-2nd', 'podium-1st', 'podium-3rd'];
  const podiumEmoji = ['🥈', '🥇', '🥉'];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0f0f1a, #1a0a3e)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 20px',
      gap: '32px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>🏆</div>
        <h1 style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Game Over!
        </h1>
        <p style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Here are the final results</p>
      </div>

      {/* Podium visualization */}
      {podium.length >= 1 && (
        <div className="podium" style={{ maxWidth: '420px' }}>
          {ordered.map((entry, i) => {
            if (!entry) return <div key={i} style={{ flex: 1 }} />;
            return (
              <div key={entry.socketId} className={`podium-place ${podiumClasses[i]}`}>
                <div className="podium-avatar">{podiumEmoji[i]}</div>
                <div className="podium-name">{entry.name}</div>
                <div className="podium-score">{entry.score.toLocaleString()} pts</div>
                <div className="podium-block">{podiumEmoji[i]}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full leaderboard */}
      {finalLeaderboard.length > 3 && (
        <div style={{ width: '100%', maxWidth: '500px' }}>
          <h4 style={{ textAlign: 'center', marginBottom: '12px', color: 'var(--text-dim)' }}>All Scores</h4>
          <Leaderboard entries={finalLeaderboard} maxRows={15} />
        </div>
      )}

      <button className="btn btn-primary btn-lg" onClick={onPlayAgain}>
        🎮 Play Again
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Setup Screen (before room is created)
// ─────────────────────────────────────────────────────────────
function HostSetup({ onCreateRoom, onBack, quizzes }) {
  const [selectedQuiz, setSelectedQuiz] = useState(quizzes[0]?.id || '');
  const [teamMode, setTeamMode]         = useState(false);

  // Quizzes load asynchronously — once they arrive, auto-select the first one
  useEffect(() => {
    if (quizzes.length > 0 && !selectedQuiz) {
      setSelectedQuiz(quizzes[0].id);
    }
  }, [quizzes]);

  return (
    <div className="screen-centered fade-in">
      <div className="card card-wide">
        <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '20px' }}>
          ← Back
        </button>
        <div className="badge badge-purple" style={{ marginBottom: '16px' }}>Host Setup</div>
        <h2 style={{ marginBottom: '8px' }}>Create a Game</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: '28px', fontWeight: 600 }}>
          Choose a quiz and share the PIN with your players.
        </p>

        <div className="form-group">
          <label className="form-label">Select Quiz</label>
          <select
            className="input"
            value={selectedQuiz}
            onChange={(e) => setSelectedQuiz(e.target.value)}
            style={{ cursor: 'pointer' }}
          >
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title} ({q.questionCount} questions)
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '14px', background: 'var(--darker)', borderRadius: 'var(--radius)', cursor: 'pointer' }} onClick={() => setTeamMode(!teamMode)}>
          <input type="checkbox" checked={teamMode} onChange={() => setTeamMode(!teamMode)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
          <div>
            <div style={{ fontWeight: 700 }}>👥 Team Mode</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 600 }}>Players join as Red, Blue, Green, or Yellow teams</div>
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg btn-full"
          onClick={() => onCreateRoom(selectedQuiz, teamMode)}
          disabled={!selectedQuiz}
        >
          🚀 Create Room {teamMode ? '(Team Mode)' : ''}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HostView — main container that routes between host screens
// ─────────────────────────────────────────────────────────────
export default function HostView({ state, actions }) {
  const { gamePhase, roomCode, hostData } = state;
  const [quizzes, setQuizzes] = useState([]);

  // Fetch available quizzes
  useEffect(() => {
    fetch(`${API_URL}/api/quizzes`)
      .then((r) => r.json())
      .then(setQuizzes)
      .catch(() => setQuizzes([{ id: 'quiz-general', title: 'General Knowledge', questionCount: 10 }]));
  }, []);

  const isLastQuestion =
    hostData.currentQuestion &&
    hostData.currentQuestion.questionIndex + 1 >= hostData.currentQuestion.totalQuestions;

  // Route between host screens based on game phase
  if (!roomCode) {
    return (
      <HostSetup
        onCreateRoom={actions.createRoom}
        onBack={actions.reset}
        quizzes={quizzes}
      />
    );
  }

  if (gamePhase === 'lobby') {
    return (
      <HostLobby
        roomCode={roomCode}
        hostData={hostData}
        onStart={actions.startGame}
        onBack={actions.reset}
      />
    );
  }

  if (gamePhase === 'question') {
    return (
      <HostQuestion
        hostData={hostData}
        onEndEarly={actions.endGame}
      />
    );
  }

  if (gamePhase === 'reveal') {
    return (
      <HostReveal
        hostData={hostData}
        onNext={actions.nextQuestion}
        isLastQuestion={isLastQuestion}
      />
    );
  }

  if (gamePhase === 'finished') {
    return (
      <HostPodium
        finalLeaderboard={hostData.finalLeaderboard}
        onPlayAgain={actions.reset}
      />
    );
  }

  // Fallback
  return (
    <div className="screen-centered">
      <div className="spinner" />
    </div>
  );
}
