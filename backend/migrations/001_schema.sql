-- ══════════════════════════════════════════════════════════════
--  Sabnaya – PostgreSQL / Supabase Schema
--  Run once against your Supabase project (SQL editor) or via psql
-- ══════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────
-- QUIZZES
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quizzes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  cover_image  TEXT,           -- URL to cover image
  created_by   VARCHAR(255),   -- admin username or NULL
  is_public    BOOLEAN  NOT NULL DEFAULT TRUE,
  is_active    BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- QUESTIONS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id      UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  image_url    TEXT,           -- Optional image displayed on host screen
  time_limit   INTEGER NOT NULL DEFAULT 20 CHECK (time_limit BETWEEN 5 AND 120),
  order_index  INTEGER NOT NULL DEFAULT 0,
  points_base  INTEGER NOT NULL DEFAULT 500,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- ANSWER OPTIONS  (always 4 per question, order_index 0-3)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS answer_options (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  is_correct   BOOLEAN NOT NULL DEFAULT FALSE,
  order_index  INTEGER NOT NULL DEFAULT 0  CHECK (order_index BETWEEN 0 AND 3),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, order_index)
);

-- Enforce exactly one correct answer per question
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_correct_per_question
  ON answer_options (question_id)
  WHERE is_correct = TRUE;

-- ──────────────────────────────────────────────
-- GAME SESSIONS  (persisted for history / analytics)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code    VARCHAR(10) NOT NULL,
  quiz_id      UUID REFERENCES quizzes(id) ON DELETE SET NULL,
  quiz_title   VARCHAR(255),
  host_name    VARCHAR(255),
  player_count INTEGER DEFAULT 0,
  started_at   TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ,
  is_team_mode BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- PLAYER RESULTS  (final scores per session)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_name     VARCHAR(100) NOT NULL,
  team_name       VARCHAR(100),
  final_score     INTEGER NOT NULL DEFAULT 0,
  rank            INTEGER,
  correct_count   INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  max_streak      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- TEAMS  (optional, per session)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  team_name    VARCHAR(100) NOT NULL,
  team_color   VARCHAR(20),
  final_score  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, team_name)
);

-- ──────────────────────────────────────────────
-- SEED DATA — General Knowledge Quiz
-- ──────────────────────────────────────────────
DO $$
DECLARE
  quiz_id   UUID;
  q1_id     UUID; q2_id UUID; q3_id UUID; q4_id UUID; q5_id UUID;
  q6_id     UUID; q7_id UUID; q8_id UUID; q9_id UUID; q10_id UUID;
BEGIN
  INSERT INTO quizzes (title, description, is_public)
  VALUES ('General Knowledge Challenge', 'A fun mix of trivia questions across science, history, and pop culture.', TRUE)
  RETURNING id INTO quiz_id;

  -- Q1
  INSERT INTO questions (quiz_id, text, time_limit, order_index)
  VALUES (quiz_id, 'What is the capital city of France?', 20, 0) RETURNING id INTO q1_id;
  INSERT INTO answer_options (question_id, text, is_correct, order_index) VALUES
    (q1_id, 'London',  FALSE, 0), (q1_id, 'Berlin', FALSE, 1),
    (q1_id, 'Paris',   TRUE,  2), (q1_id, 'Madrid', FALSE, 3);

  -- Q2
  INSERT INTO questions (quiz_id, text, time_limit, order_index)
  VALUES (quiz_id, 'How many planets are in our Solar System?', 15, 1) RETURNING id INTO q2_id;
  INSERT INTO answer_options (question_id, text, is_correct, order_index) VALUES
    (q2_id, '7', FALSE, 0), (q2_id, '8', TRUE, 1),
    (q2_id, '9', FALSE, 2), (q2_id, '10', FALSE, 3);

  -- Q3
  INSERT INTO questions (quiz_id, text, time_limit, order_index)
  VALUES (quiz_id, 'What is the chemical symbol for Gold?', 20, 2) RETURNING id INTO q3_id;
  INSERT INTO answer_options (question_id, text, is_correct, order_index) VALUES
    (q3_id, 'Go', FALSE, 0), (q3_id, 'Gd', FALSE, 1),
    (q3_id, 'Gl', FALSE, 2), (q3_id, 'Au', TRUE,  3);

  -- Q4
  INSERT INTO questions (quiz_id, text, time_limit, order_index)
  VALUES (quiz_id, 'Who painted the Mona Lisa?', 20, 3) RETURNING id INTO q4_id;
  INSERT INTO answer_options (question_id, text, is_correct, order_index) VALUES
    (q4_id, 'Michelangelo', FALSE, 0), (q4_id, 'Leonardo da Vinci', TRUE, 1),
    (q4_id, 'Raphael',      FALSE, 2), (q4_id, 'Caravaggio',       FALSE, 3);

  -- Q5
  INSERT INTO questions (quiz_id, text, time_limit, order_index)
  VALUES (quiz_id, 'What is the speed of light (approx.) in km/s?', 25, 4) RETURNING id INTO q5_id;
  INSERT INTO answer_options (question_id, text, is_correct, order_index) VALUES
    (q5_id, '150,000 km/s', FALSE, 0), (q5_id, '200,000 km/s', FALSE, 1),
    (q5_id, '300,000 km/s', TRUE,  2), (q5_id, '400,000 km/s', FALSE, 3);

END $$;

-- ──────────────────────────────────────────────
-- HELPFUL INDEXES
-- ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id      ON questions    (quiz_id, order_index);
CREATE INDEX IF NOT EXISTS idx_answers_question_id    ON answer_options (question_id, order_index);
CREATE INDEX IF NOT EXISTS idx_player_results_session ON player_results (session_id);
CREATE INDEX IF NOT EXISTS idx_teams_session          ON teams (session_id);

-- ──────────────────────────────────────────────
-- Row-Level Security (Supabase) — optional
-- Enable anon read for public quizzes
-- ──────────────────────────────────────────────
-- ALTER TABLE quizzes       ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "public_read" ON quizzes USING (is_public = TRUE);
