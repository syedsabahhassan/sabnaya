import React, { useState, useEffect } from 'react';
import QuizList from './QuizList';
import QuizEditor from './QuizEditor';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'trivia-admin-secret';

// ─────────────────────────────────────────────
// Simple password gate
// ─────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === ADMIN_SECRET) {
      onLogin();
    } else {
      setError('Incorrect admin password.');
    }
  };

  return (
    <div className="screen-centered fade-in">
      <div className="card" style={{ maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '2.5rem' }}>🔐</div>
          <h2 style={{ marginTop: '8px' }}>Admin Panel</h2>
          <p style={{ color: 'var(--text-dim)', fontWeight: 600, marginTop: '6px' }}>
            Quiz creator & manager
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Admin Password</label>
            <input
              type="password"
              className="input"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          {error && (
            <div style={{ color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 700 }}>⚠️ {error}</div>
          )}
          <button type="submit" className="btn btn-primary btn-full">
            Login →
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Admin Panel Root
// ─────────────────────────────────────────────
export default function AdminPanel({ onBack }) {
  const [authed, setAuthed]       = useState(false);
  const [view, setView]           = useState('list');   // 'list' | 'editor'
  const [editingQuiz, setEditing] = useState(null);     // null = new quiz
  const [quizzes, setQuizzes]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quizzes');
      setQuizzes(await res.json());
    } catch (e) {
      showToast('Failed to load quizzes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (authed) fetchQuizzes(); }, [authed]);

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--darker)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>← Exit Admin</button>
        <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
          🎛️ Admin Panel
        </div>
        {view === 'editor' && (
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setView('list'); setEditing(null); }}>
            ← Back to Quizzes
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#7f1d1d' : '#14532d',
          border: `1px solid ${toast.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
          color: 'white', padding: '12px 24px', borderRadius: 'var(--radius)',
          fontWeight: 700, zIndex: 9999, boxShadow: 'var(--shadow-lg)',
          animation: 'toastIn 0.3s ease',
        }}>
          {toast.type === 'error' ? '⚠️' : '✅'} {toast.msg}
        </div>
      )}

      <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
        {view === 'list' && (
          <QuizList
            quizzes={quizzes}
            loading={loading}
            onRefresh={fetchQuizzes}
            onNew={() => { setEditing(null); setView('editor'); }}
            onEdit={(quiz) => { setEditing(quiz); setView('editor'); }}
            onDelete={async (id) => {
              if (!window.confirm('Delete this quiz?')) return;
              await fetch(`/api/admin/quizzes/${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-secret': ADMIN_SECRET },
              });
              showToast('Quiz deleted');
              fetchQuizzes();
            }}
            adminSecret={ADMIN_SECRET}
          />
        )}

        {view === 'editor' && (
          <QuizEditor
            quiz={editingQuiz}
            adminSecret={ADMIN_SECRET}
            onSaved={(msg) => { showToast(msg || 'Saved!'); setView('list'); fetchQuizzes(); }}
            onCancel={() => { setView('list'); setEditing(null); }}
          />
        )}
      </div>
    </div>
  );
}
