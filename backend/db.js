/**
 * db.js – Supabase client (PostgreSQL)
 *
 * Falls back gracefully to in-memory mode (sampleQuiz.js) when
 * SUPABASE_URL / SUPABASE_SERVICE_KEY are not set, so development
 * works without a DB.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // service role for server-side

let supabase = null;
let isConnected = false;

if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
  isConnected = true;
  console.log('[DB] Supabase connected:', SUPABASE_URL);
} else {
  console.warn('[DB] No Supabase credentials — using in-memory sampleQuiz fallback');
}

module.exports = { supabase, isConnected };
