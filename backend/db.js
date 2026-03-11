/**
 * db.js – PostgreSQL client via Railway's DATABASE_URL
 *
 * Falls back gracefully to in-memory mode (sampleQuiz.js) when
 * DATABASE_URL is not set, so local development works without a DB.
 */

const { Pool } = require('pg');

let pool = null;
let isConnected = false;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost')
      ? false
      : { rejectUnauthorized: false },
  });
  isConnected = true;
  console.log('[DB] PostgreSQL connected via DATABASE_URL');
} else {
  console.warn('[DB] No DATABASE_URL found — using in-memory sampleQuiz fallback');
}

// ─────────────────────────────────────────────
// Auto-create tables on first run
// ─────────────────────────────────────────────
async function initSchema() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title       TEXT NOT NULL,
        description TEXT DEFAULT '',
        cover_image TEXT,
        is_public   BOOLEAN DEFAULT TRUE,
        is_active   BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS questions (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_id     UUID REFERENCES quizzes(id) ON DELETE CASCADE,
        text        TEXT NOT NULL,
        image_url   TEXT,
        time_limit  INTEGER DEFAULT 20,
        points_base INTEGER DEFAULT 500,
        order_index INTEGER DEFAULT 0,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS answer_options (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
        text        TEXT NOT NULL,
        is_correct  BOOLEAN DEFAULT FALSE,
        order_index INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS game_sessions (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_code    TEXT,
        quiz_id      UUID,
        quiz_title   TEXT,
        host_name    TEXT,
        player_count INTEGER,
        started_at   TIMESTAMPTZ,
        finished_at  TIMESTAMPTZ,
        is_team_mode BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS player_results (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id      UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
        player_name     TEXT,
        team_name       TEXT,
        final_score     INTEGER,
        rank            INTEGER,
        correct_count   INTEGER,
        total_questions INTEGER,
        max_streak      INTEGER
      );
    `);
    console.log('[DB] Schema ready');
  } catch (err) {
    console.error('[DB] Schema init error:', err.message);
  }
}

module.exports = { pool, isConnected, initSchema };
