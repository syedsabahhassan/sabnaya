import React, { useState, useEffect } from 'react';

const TILE_SHAPES = ['▲', '◆', '●', '■'];
const TILE_COLORS = ['#e74c3c', '#2980b9', '#e67e22', '#27ae60'];

// ─────────────────────────────────────────────
// Individual Question Editor Row
// ─────────────────────────────────────────────
function QuestionRow({ question, index, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast, adminSecret, quizId }) {
  const [uploading, setUploading] = useState(false);

  const updateAnswer = (answerIdx, field, value) => {
    const newAnswers = question.answers.map((a, i) =>
      i === answerIdx ? { ...a, [field]: value } : a
    );
    onChange({ ...question, answers: newAnswers });
  };

  const setCorrect = (answerIdx) => {
    const newAnswers = question.answers.map((a, i) => ({ ...a, isCorrect: i === answerIdx }));
    onChange({ ...question, answers: newAnswers });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'x-admin-secret': adminSecret },
        body: formData,
      });
      const { imageUrl } = await res.json();
      onChange({ ...question, imageUrl });
    } catch (e) {
      alert('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      background: 'var(--darker)',
      borderRadius: '16px',
      padding: '20px',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Question header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div className="badge badge-purple">Q{index + 1}</div>
        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
          <button className="btn btn-secondary btn-sm" onClick={onMoveUp} disabled={isFirst} title="Move up">↑</button>
          <button className="btn btn-secondary btn-sm" onClick={onMoveDown} disabled={isLast} title="Move down">↓</button>
          <button
            className="btn btn-sm"
            onClick={onDelete}
            style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            🗑
          </button>
        </div>
      </div>

      {/* Question text */}
      <div className="form-group">
        <label className="form-label">Question Text</label>
        <textarea
          className="input"
          rows={2}
          value={question.text}
          onChange={(e) => onChange({ ...question, text: e.target.value })}
          placeholder="Type your question here..."
          style={{ resize: 'vertical', fontWeight: 600 }}
        />
      </div>

      {/* Image upload */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <label className="form-label" style={{ marginBottom: 0 }}>📷 Question Image (optional)</label>
        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
          {uploading ? '⏳ Uploading…' : '+ Upload Image'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
        </label>
        {question.imageUrl && (
          <>
            <img src={question.imageUrl} alt="" style={{ height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
            <button
              className="btn btn-sm"
              onClick={() => onChange({ ...question, imageUrl: null })}
              style={{ color: 'var(--danger)' }}
            >✕</button>
          </>
        )}
        {question.imageUrl && (
          <input
            className="input"
            value={question.imageUrl}
            onChange={(e) => onChange({ ...question, imageUrl: e.target.value })}
            placeholder="Or paste image URL"
            style={{ flex: 1, minWidth: '200px', fontSize: '0.8rem' }}
          />
        )}
      </div>

      {/* Time limit + Points */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: 1, minWidth: '140px' }}>
          <label className="form-label">⏱ Time Limit (seconds)</label>
          <select
            className="input"
            value={question.timeLimit || 20}
            onChange={(e) => onChange({ ...question, timeLimit: Number(e.target.value) })}
          >
            {[5, 10, 15, 20, 30, 45, 60, 90, 120].map((t) => (
              <option key={t} value={t}>{t}s</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: '140px' }}>
          <label className="form-label">⭐ Base Points</label>
          <select
            className="input"
            value={question.pointsBase || 500}
            onChange={(e) => onChange({ ...question, pointsBase: Number(e.target.value) })}
          >
            {[100, 250, 500, 1000, 2000].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Answer options */}
      <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>
        Answer Options (click ✓ to mark correct)
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {question.answers.map((answer, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: TILE_COLORS[i], display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0,
              color: 'white', fontWeight: 900,
            }}>
              {TILE_SHAPES[i]}
            </div>
            <input
              className="input"
              value={answer.text}
              onChange={(e) => updateAnswer(i, 'text', e.target.value)}
              placeholder={`Answer ${i + 1}`}
              style={{ flex: 1, fontWeight: 600 }}
            />
            <button
              title="Mark as correct answer"
              onClick={() => setCorrect(i)}
              style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: answer.isCorrect ? 'var(--success)' : 'var(--surface2)',
                border: `2px solid ${answer.isCorrect ? 'var(--success)' : 'rgba(255,255,255,0.15)'}`,
                cursor: 'pointer',
                fontSize: '1.1rem', flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              {answer.isCorrect ? '✓' : '○'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// New blank question template
// ─────────────────────────────────────────────
function newQuestion(index) {
  return {
    _localId: Date.now() + index,
    text: '',
    imageUrl: null,
    timeLimit: 20,
    pointsBase: 500,
    answers: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  };
}

// ─────────────────────────────────────────────
// Quiz Editor (create or edit a quiz)
// ─────────────────────────────────────────────
export default function QuizEditor({ quiz, adminSecret, onSaved, onCancel }) {
  const isNew = !quiz?.id;

  const [title, setTitle]           = useState(quiz?.title || '');
  const [description, setDesc]      = useState(quiz?.description || '');
  const [isPublic, setPublic]       = useState(quiz?.isPublic !== false);
  const [questions, setQuestions]   = useState(() => {
    if (quiz?.questions?.length) {
      return quiz.questions.map((q) => ({ ...q, _localId: q.id || Date.now() }));
    }
    return [newQuestion(0)];
  });
  const [saving, setSaving]         = useState(false);
  const [errors, setErrors]         = useState([]);

  const validate = () => {
    const errs = [];
    if (!title.trim()) errs.push('Quiz title is required.');
    if (questions.length === 0) errs.push('Add at least one question.');
    questions.forEach((q, i) => {
      if (!q.text.trim()) errs.push(`Q${i + 1}: Question text is empty.`);
      if (!q.answers.some((a) => a.isCorrect)) errs.push(`Q${i + 1}: No correct answer selected.`);
      if (q.answers.some((a) => !a.text.trim())) errs.push(`Q${i + 1}: All 4 answer options must be filled in.`);
    });
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setSaving(true);

    try {
      const headers = { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret };

      if (isNew) {
        // 1. Create quiz
        const qRes  = await fetch('/api/admin/quizzes', { method: 'POST', headers, body: JSON.stringify({ title, description, isPublic }) });
        const qData = await qRes.json();
        if (!qRes.ok) throw new Error(qData.error || 'Failed to create quiz');

        // 2. Create questions
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          await fetch(`/api/admin/quizzes/${qData.id}/questions`, {
            method: 'POST', headers,
            body: JSON.stringify({ text: q.text, imageUrl: q.imageUrl, timeLimit: q.timeLimit, pointsBase: q.pointsBase, orderIndex: i, answers: q.answers }),
          });
        }
      } else {
        // Update metadata
        await fetch(`/api/admin/quizzes/${quiz.id}`, { method: 'PUT', headers, body: JSON.stringify({ title, description, isPublic }) });

        // For simplicity, delete all questions and re-create them
        // In production you'd diff and patch
        for (const q of (quiz.questions || [])) {
          if (q.id) await fetch(`/api/admin/questions/${q.id}`, { method: 'DELETE', headers });
        }
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          await fetch(`/api/admin/quizzes/${quiz.id}/questions`, {
            method: 'POST', headers,
            body: JSON.stringify({ text: q.text, imageUrl: q.imageUrl, timeLimit: q.timeLimit, pointsBase: q.pointsBase, orderIndex: i, answers: q.answers }),
          });
        }
      }

      onSaved(isNew ? 'Quiz created!' : 'Quiz updated!');
    } catch (e) {
      setErrors([e.message]);
    } finally {
      setSaving(false);
    }
  };

  const updateQuestion = (index, updated) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? updated : q)));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, newQuestion(prev.length)]);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  };

  const deleteQuestion = (index) => {
    if (questions.length <= 1) return alert('A quiz must have at least 1 question.');
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const moveQuestion = (index, direction) => {
    setQuestions((prev) => {
      const arr = [...prev];
      const target = index + direction;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Quiz metadata */}
      <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 style={{ marginBottom: '20px' }}>{isNew ? '+ Create New Quiz' : '✏️ Edit Quiz'}</h2>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '2 1 280px' }}>
            <label className="form-label">Quiz Title *</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. World Geography Challenge"
              maxLength={80}
            />
          </div>
          <div className="form-group" style={{ flex: '3 1 300px' }}>
            <label className="form-label">Description</label>
            <input
              className="input"
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Optional short description"
              maxLength={200}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700 }}>
              <input type="checkbox" checked={isPublic} onChange={(e) => setPublic(e.target.checked)} />
              🌐 Public
            </label>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <h3>Questions ({questions.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={addQuestion}>+ Add Question</button>
      </div>

      {questions.map((q, i) => (
        <QuestionRow
          key={q._localId}
          question={q}
          index={i}
          onChange={(updated) => updateQuestion(i, updated)}
          onDelete={() => deleteQuestion(i)}
          onMoveUp={() => moveQuestion(i, -1)}
          onMoveDown={() => moveQuestion(i, +1)}
          isFirst={i === 0}
          isLast={i === questions.length - 1}
          adminSecret={adminSecret}
        />
      ))}

      <button className="btn btn-secondary btn-full" onClick={addQuestion} style={{ borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.15)' }}>
        + Add Another Question
      </button>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)',
          borderRadius: 'var(--radius)', padding: '16px',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '8px' }}>⚠️ Please fix these issues:</div>
          {errors.map((e, i) => (
            <div key={i} style={{ color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 600 }}>• {e}</div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingBottom: '40px' }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-success btn-lg" onClick={handleSave} disabled={saving}>
          {saving ? '⏳ Saving…' : `💾 ${isNew ? 'Create Quiz' : 'Save Changes'}`}
        </button>
      </div>
    </div>
  );
}
