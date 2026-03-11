import React from 'react';

export default function QuizList({ quizzes, loading, onNew, onEdit, onDelete, onRefresh }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ marginBottom: '4px' }}>Quiz Library</h2>
          <p style={{ color: 'var(--text-dim)', fontWeight: 600 }}>
            {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={onRefresh}>↻ Refresh</button>
          <button className="btn btn-primary" onClick={onNew}>+ New Quiz</button>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--surface)', borderRadius: '20px',
          border: '2px dashed rgba(255,255,255,0.1)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📚</div>
          <h3 style={{ marginBottom: '8px' }}>No quizzes yet</h3>
          <p style={{ color: 'var(--text-dim)', marginBottom: '20px', fontWeight: 600 }}>
            Create your first quiz to get started
          </p>
          <button className="btn btn-primary" onClick={onNew}>Create Quiz</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              style={{
                background: 'var(--surface)',
                borderRadius: '16px',
                padding: '20px 24px',
                border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              {quiz.coverImage && (
                <img
                  src={quiz.coverImage}
                  alt=""
                  style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover' }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '4px' }}>{quiz.title}</div>
                {quiz.description && (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    {quiz.description}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span className="badge badge-purple">📝 {quiz.questionCount} questions</span>
                  {quiz.isPublic !== false && <span className="badge badge-green">🌐 Public</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onEdit(quiz)}
                >
                  ✏️ Edit
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => onDelete(quiz.id)}
                  style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
