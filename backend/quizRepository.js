/**
 * quizRepository.js
 * All database CRUD for quizzes, questions, and answer options.
 * Uses Railway PostgreSQL via the pg library.
 * Falls back to sampleQuiz.js when DATABASE_URL is not configured.
 */

const { pool, isConnected } = require('./db');
const sampleQuizzes = require('./sampleQuiz');

async function listQuizzes() {
  if (!isConnected) {
    return sampleQuizzes.map((q) => ({
      id: q.id, title: q.title, description: q.description || '',
      questionCount: q.questions.length,
    }));
  }
  const { rows: quizzes } = await pool.query(
    `SELECT id, title, description, cover_image, is_public, created_at
     FROM quizzes WHERE is_active = TRUE ORDER BY created_at DESC`
  );
  const { rows: counts } = await pool.query(
    `SELECT quiz_id, COUNT(*) AS cnt FROM questions GROUP BY quiz_id`
  );
  const countMap = {};
  for (const c of counts) countMap[c.quiz_id] = parseInt(c.cnt, 10);
  return quizzes.map((q) => ({
    id: q.id, title: q.title, description: q.description,
    coverImage: q.cover_image, isPublic: q.is_public,
    questionCount: countMap[q.id] || 0, createdAt: q.created_at,
  }));
}

async function getQuiz(id) {
  if (!isConnected) return sampleQuizzes.find((q) => q.id === id) || null;
  const { rows: quizRows } = await pool.query(
    `SELECT * FROM quizzes WHERE id = $1 AND is_active = TRUE`, [id]
  );
  if (!quizRows.length) return null;
  const quiz = quizRows[0];
  const { rows: questions } = await pool.query(
    `SELECT * FROM questions WHERE quiz_id = $1 ORDER BY order_index`, [id]
  );
  const qIds = questions.map((q) => q.id);
  let options = [];
  if (qIds.length) {
    const { rows } = await pool.query(
      `SELECT * FROM answer_options WHERE question_id = ANY($1::uuid[]) ORDER BY order_index`,
      [qIds]
    );
    options = rows;
  }
  const optsByQ = {};
  for (const opt of options) {
    if (!optsByQ[opt.question_id]) optsByQ[opt.question_id] = [];
    optsByQ[opt.question_id].push(opt);
  }
  return {
    id: quiz.id, title: quiz.title,
    description: quiz.description || '', coverImage: quiz.cover_image || null,
    questions: questions.map((q) => ({
      id: q.id, text: q.text, imageUrl: q.image_url || null,
      timeLimit: q.time_limit, pointsBase: q.points_base || 500, order: q.order_index,
      answers: (optsByQ[q.id] || []).map((o) => ({
        id: o.id, text: o.text, isCorrect: o.is_correct,
      })),
    })),
  };
}

async function createQuiz({ title, description, coverImage, isPublic = true }) {
  if (!isConnected) throw new Error('Database not connected');
  const { rows } = await pool.query(
    `INSERT INTO quizzes (title, description, cover_image, is_public)
     VALUES ($1, $2, $3, $4) RETURNING id, title, description`,
    [title, description || '', coverImage || null, isPublic]
  );
  return rows[0];
}

async function updateQuiz(id, { title, description, coverImage, isPublic }) {
  if (!isConnected) throw new Error('Database not connected');
  const { rows } = await pool.query(
    `UPDATE quizzes SET title=COALESCE($1,title), description=COALESCE($2,description),
     cover_image=COALESCE($3,cover_image), is_public=COALESCE($4,is_public), updated_at=NOW()
     WHERE id=$5 RETURNING *`,
    [title, description, coverImage, isPublic, id]
  );
  return rows[0];
}

async function deleteQuiz(id) {
  if (!isConnected) throw new Error('Database not connected');
  await pool.query(`UPDATE quizzes SET is_active=FALSE WHERE id=$1`, [id]);
  return true;
}

async function createQuestion(quizId, { text, imageUrl, timeLimit=20, pointsBase=500, orderIndex, answers }) {
  if (!isConnected) throw new Error('Database not connected');
  if (orderIndex === undefined) {
    const { rows } = await pool.query(
      `SELECT COALESCE(MAX(order_index)+1,0) AS next FROM questions WHERE quiz_id=$1`, [quizId]
    );
    orderIndex = parseInt(rows[0].next, 10);
  }
  const { rows: qRows } = await pool.query(
    `INSERT INTO questions (quiz_id,text,image_url,time_limit,points_base,order_index)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [quizId, text, imageUrl||null, timeLimit, pointsBase, orderIndex]
  );
  const question = qRows[0];
  if (answers && answers.length === 4) {
    for (let i = 0; i < answers.length; i++) {
      await pool.query(
        `INSERT INTO answer_options (question_id,text,is_correct,order_index) VALUES ($1,$2,$3,$4)`,
        [question.id, answers[i].text, answers[i].isCorrect, i]
      );
    }
  }
  return question;
}

async function updateQuestion(questionId, { text, imageUrl, timeLimit, pointsBase, answers }) {
  if (!isConnected) throw new Error('Database not connected');
  await pool.query(
    `UPDATE questions SET text=COALESCE($1,text), image_url=COALESCE($2,image_url),
     time_limit=COALESCE($3,time_limit), points_base=COALESCE($4,points_base), updated_at=NOW()
     WHERE id=$5`,
    [text, imageUrl, timeLimit, pointsBase, questionId]
  );
  if (answers && answers.length === 4) {
    await pool.query(`DELETE FROM answer_options WHERE question_id=$1`, [questionId]);
    for (let i = 0; i < answers.length; i++) {
      await pool.query(
        `INSERT INTO answer_options (question_id,text,is_correct,order_index) VALUES ($1,$2,$3,$4)`,
        [questionId, answers[i].text, answers[i].isCorrect, i]
      );
    }
  }
  return { id: questionId };
}

async function deleteQuestion(questionId) {
  if (!isConnected) throw new Error('Database not connected');
  await pool.query(`DELETE FROM questions WHERE id=$1`, [questionId]);
  return true;
}

async function reorderQuestions(quizId, orderedIds) {
  if (!isConnected) throw new Error('Database not connected');
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query(`UPDATE questions SET order_index=$1 WHERE id=$2`, [i, orderedIds[i]]);
  }
  return true;
}

async function saveGameSession({ roomCode, quizId, quizTitle, hostName, playerResults, isTeamMode=false }) {
  if (!isConnected) return null;
  const { rows } = await pool.query(
    `INSERT INTO game_sessions (room_code,quiz_id,quiz_title,host_name,player_count,started_at,finished_at,is_team_mode)
     VALUES ($1,$2,$3,$4,$5,NOW(),NOW(),$6) RETURNING id`,
    [roomCode, quizId, quizTitle, hostName, playerResults.length, isTeamMode]
  );
  const sessionId = rows[0].id;
  for (let i = 0; i < playerResults.length; i++) {
    const pr = playerResults[i];
    await pool.query(
      `INSERT INTO player_results (session_id,player_name,team_name,final_score,rank,correct_count,total_questions,max_streak)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [sessionId, pr.name, pr.teamName||null, pr.score, i+1, pr.correctCount||0, pr.totalQuestions||0, pr.maxStreak||0]
    );
  }
  return sessionId;
}

module.exports = {
  listQuizzes, getQuiz, createQuiz, updateQuiz, deleteQuiz,
  createQuestion, updateQuestion, deleteQuestion, reorderQuestions, saveGameSession,
};
