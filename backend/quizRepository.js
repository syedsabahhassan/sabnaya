/**
 * quizRepository.js
 * All database CRUD for quizzes, questions, and answer options.
 * Falls back to sampleQuiz.js when DB is not configured.
 */

const { supabase, isConnected } = require('./db');
const sampleQuizzes = require('./sampleQuiz');

// ─────────────────────────────────────────────
// Helpers – shape DB rows into the game engine format
// ─────────────────────────────────────────────

/** Convert flat DB rows into nested quiz object the game engine expects */
function buildQuizFromRows({ quiz, questions, options }) {
  const optionsByQuestion = {};
  for (const opt of options) {
    if (!optionsByQuestion[opt.question_id]) optionsByQuestion[opt.question_id] = [];
    optionsByQuestion[opt.question_id].push(opt);
  }

  const formattedQuestions = questions
    .sort((a, b) => a.order_index - b.order_index)
    .map((q) => {
      const opts = (optionsByQuestion[q.id] || []).sort((a, b) => a.order_index - b.order_index);
      return {
        id: q.id,
        text: q.text,
        imageUrl: q.image_url || null,
        timeLimit: q.time_limit,
        pointsBase: q.points_base || 500,
        order: q.order_index,
        answers: opts.map((o) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.is_correct,
        })),
      };
    });

  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description || '',
    coverImage: quiz.cover_image || null,
    questions: formattedQuestions,
  };
}

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────
async function listQuizzes() {
  if (!isConnected) {
    return sampleQuizzes.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description || '',
      questionCount: q.questions.length,
    }));
  }

  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, description, cover_image, is_public, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get question counts
  const { data: counts } = await supabase
    .from('questions')
    .select('quiz_id');

  const countMap = {};
  for (const c of counts || []) {
    countMap[c.quiz_id] = (countMap[c.quiz_id] || 0) + 1;
  }

  return (data || []).map((q) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    coverImage: q.cover_image,
    isPublic: q.is_public,
    questionCount: countMap[q.id] || 0,
    createdAt: q.created_at,
  }));
}

// ─────────────────────────────────────────────
// GET ONE
// ─────────────────────────────────────────────
async function getQuiz(id) {
  if (!isConnected) {
    const q = sampleQuizzes.find((q) => q.id === id);
    return q || null;
  }

  const [{ data: quiz, error: qErr }, { data: questions, error: qsErr }, { data: options, error: oErr }] =
    await Promise.all([
      supabase.from('quizzes').select('*').eq('id', id).single(),
      supabase.from('questions').select('*').eq('quiz_id', id),
      supabase
        .from('answer_options')
        .select('*')
        .in(
          'question_id',
          (await supabase.from('questions').select('id').eq('quiz_id', id)).data?.map((q) => q.id) || []
        ),
    ]);

  if (qErr) throw qErr;
  if (!quiz) return null;

  return buildQuizFromRows({ quiz, questions: questions || [], options: options || [] });
}

// ─────────────────────────────────────────────
// CREATE QUIZ
// ─────────────────────────────────────────────
async function createQuiz({ title, description, coverImage, isPublic = true }) {
  if (!isConnected) throw new Error('Database not connected');

  const { data, error } = await supabase
    .from('quizzes')
    .insert({ title, description, cover_image: coverImage, is_public: isPublic })
    .select()
    .single();

  if (error) throw error;
  return { id: data.id, title: data.title, description: data.description };
}

// ─────────────────────────────────────────────
// UPDATE QUIZ
// ─────────────────────────────────────────────
async function updateQuiz(id, { title, description, coverImage, isPublic }) {
  if (!isConnected) throw new Error('Database not connected');

  const updates = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (coverImage !== undefined) updates.cover_image = coverImage;
  if (isPublic !== undefined) updates.is_public = isPublic;

  const { data, error } = await supabase
    .from('quizzes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────
// DELETE QUIZ (soft delete)
// ─────────────────────────────────────────────
async function deleteQuiz(id) {
  if (!isConnected) throw new Error('Database not connected');
  const { error } = await supabase.from('quizzes').update({ is_active: false }).eq('id', id);
  if (error) throw error;
  return true;
}

// ─────────────────────────────────────────────
// CREATE / UPDATE / DELETE QUESTION
// ─────────────────────────────────────────────
async function createQuestion(quizId, { text, imageUrl, timeLimit = 20, pointsBase = 500, orderIndex, answers }) {
  if (!isConnected) throw new Error('Database not connected');

  // Get current max order if not specified
  if (orderIndex === undefined) {
    const { data } = await supabase
      .from('questions')
      .select('order_index')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: false })
      .limit(1);
    orderIndex = data && data.length > 0 ? data[0].order_index + 1 : 0;
  }

  const { data: question, error: qErr } = await supabase
    .from('questions')
    .insert({
      quiz_id: quizId,
      text,
      image_url: imageUrl || null,
      time_limit: timeLimit,
      points_base: pointsBase,
      order_index: orderIndex,
    })
    .select()
    .single();

  if (qErr) throw qErr;

  // Insert answer options
  if (answers && answers.length === 4) {
    const opts = answers.map((a, i) => ({
      question_id: question.id,
      text: a.text,
      is_correct: a.isCorrect,
      order_index: i,
    }));
    const { error: oErr } = await supabase.from('answer_options').insert(opts);
    if (oErr) throw oErr;
  }

  return question;
}

async function updateQuestion(questionId, { text, imageUrl, timeLimit, pointsBase, answers }) {
  if (!isConnected) throw new Error('Database not connected');

  const updates = { updated_at: new Date().toISOString() };
  if (text !== undefined) updates.text = text;
  if (imageUrl !== undefined) updates.image_url = imageUrl;
  if (timeLimit !== undefined) updates.time_limit = timeLimit;
  if (pointsBase !== undefined) updates.points_base = pointsBase;

  const { error: qErr } = await supabase.from('questions').update(updates).eq('id', questionId);
  if (qErr) throw qErr;

  // Replace answer options
  if (answers && answers.length === 4) {
    await supabase.from('answer_options').delete().eq('question_id', questionId);
    const opts = answers.map((a, i) => ({
      question_id: questionId,
      text: a.text,
      is_correct: a.isCorrect,
      order_index: i,
    }));
    const { error: oErr } = await supabase.from('answer_options').insert(opts);
    if (oErr) throw oErr;
  }

  return { id: questionId };
}

async function deleteQuestion(questionId) {
  if (!isConnected) throw new Error('Database not connected');
  const { error } = await supabase.from('questions').delete().eq('id', questionId);
  if (error) throw error;
  return true;
}

async function reorderQuestions(quizId, orderedIds) {
  if (!isConnected) throw new Error('Database not connected');
  const updates = orderedIds.map((id, index) =>
    supabase.from('questions').update({ order_index: index }).eq('id', id)
  );
  await Promise.all(updates);
  return true;
}

// ─────────────────────────────────────────────
// SAVE GAME SESSION RESULTS (analytics)
// ─────────────────────────────────────────────
async function saveGameSession({ roomCode, quizId, quizTitle, hostName, playerResults, isTeamMode = false }) {
  if (!isConnected) return null;

  const { data: session, error: sErr } = await supabase
    .from('game_sessions')
    .insert({
      room_code: roomCode,
      quiz_id: quizId,
      quiz_title: quizTitle,
      host_name: hostName,
      player_count: playerResults.length,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      is_team_mode: isTeamMode,
    })
    .select()
    .single();

  if (sErr) return null;

  // Save player results
  const rows = playerResults.map((pr, i) => ({
    session_id: session.id,
    player_name: pr.name,
    team_name: pr.teamName || null,
    final_score: pr.score,
    rank: i + 1,
    correct_count: pr.correctCount || 0,
    total_questions: pr.totalQuestions || 0,
    max_streak: pr.maxStreak || 0,
  }));
  await supabase.from('player_results').insert(rows);

  return session.id;
}

module.exports = {
  listQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  saveGameSession,
};
