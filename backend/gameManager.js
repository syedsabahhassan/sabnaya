/**
 * Game Manager — v2
 * Adds: Streaks, Combo bonuses, Team mode, Image questions, Custom time limits
 */

const rooms = new Map();

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const BASE_POINTS       = 500;
const MAX_SPEED_BONUS   = 500;
const STREAK_THRESHOLDS = [2, 3, 4, 5]; // consecutive corrects for each tier
const STREAK_BONUSES    = [50, 100, 150, 200]; // flat bonus at each tier
const TEAM_COLORS       = ['Red', 'Blue', 'Green', 'Yellow'];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/**
 * Calculate score including speed bonus + streak/combo bonus.
 *   base points = question.pointsBase  (default 500)
 *   speed bonus = up to 500 based on remaining time
 *   streak bonus = flat bonus for consecutive correct answers
 *   maximum per question = pointsBase + 500 + 200 = ~1200
 */
function calculateScore(isCorrect, timeLimit, responseTimeMs, currentStreak = 0, pointsBase = BASE_POINTS) {
  if (!isCorrect) return { points: 0, speedBonus: 0, streakBonus: 0, streakTier: 0 };

  const timeLimitMs = timeLimit * 1000;
  const timeUsedMs  = Math.min(responseTimeMs, timeLimitMs);
  const speedRatio  = 1 - timeUsedMs / timeLimitMs;
  const speedBonus  = Math.round(MAX_SPEED_BONUS * speedRatio);

  const newStreak = currentStreak + 1;
  let streakBonus = 0;
  let streakTier  = 0;
  for (let i = STREAK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (newStreak >= STREAK_THRESHOLDS[i]) {
      streakBonus = STREAK_BONUSES[i];
      streakTier  = i + 1;
      break;
    }
  }

  return { points: pointsBase + speedBonus + streakBonus, speedBonus, streakBonus, streakTier };
}

// ─────────────────────────────────────────────
// Room Operations
// ─────────────────────────────────────────────
function createRoom(hostSocketId, quiz, options = {}) {
  let roomCode;
  do { roomCode = generateRoomCode(); } while (rooms.has(roomCode));

  const session = {
    roomCode,
    hostSocketId,
    quiz: quiz || null,
    gameState: 'lobby',
    currentQuestionIndex: -1,
    questionStartTime: null,
    answers: new Map(),
    players: new Map(),
    scores: new Map(),
    streaks: new Map(),
    maxStreaks: new Map(),
    correctCounts: new Map(),
    roundHistory: [],
    isTeamMode: options.isTeamMode || false,
    teams: new Map(),
    createdAt: Date.now(),
  };

  if (session.isTeamMode) {
    TEAM_COLORS.forEach((color) => {
      session.teams.set(color, { name: color, color, score: 0, members: [] });
    });
  }

  rooms.set(roomCode, session);
  return roomCode;
}

function joinRoom(roomCode, socketId, playerName, teamName = null) {
  const session = rooms.get(roomCode);
  if (!session) return { error: 'Room not found. Check your game PIN.' };
  if (session.gameState !== 'lobby') return { error: 'Game has already started.' };
  if (!playerName || !playerName.trim()) return { error: 'Please enter a display name.' };
  if (playerName.trim().length > 20) return { error: 'Name must be 20 characters or less.' };

  const name = playerName.trim();
  for (const p of session.players.values()) {
    if (p.name.toLowerCase() === name.toLowerCase()) return { error: 'Name already taken.' };
  }

  let resolvedTeam = null;
  if (session.isTeamMode) {
    if (teamName && session.teams.has(teamName)) {
      resolvedTeam = teamName;
    } else {
      let minCount = Infinity;
      for (const [tName, team] of session.teams) {
        if (team.members.length < minCount) { minCount = team.members.length; resolvedTeam = tName; }
      }
    }
    session.teams.get(resolvedTeam).members.push(socketId);
  }

  const player = { socketId, name, score: 0, teamName: resolvedTeam, joinedAt: Date.now(), isConnected: true };
  session.players.set(socketId, player);
  session.scores.set(socketId, 0);
  session.streaks.set(socketId, 0);
  session.maxStreaks.set(socketId, 0);
  session.correctCounts.set(socketId, 0);

  return { success: true, player };
}

function removePlayer(socketId) {
  for (const session of rooms.values()) {
    if (session.players.has(socketId)) {
      const p = session.players.get(socketId);
      p.isConnected = false;
      return { roomCode: session.roomCode, playerName: p.name };
    }
    if (session.hostSocketId === socketId) {
      return { roomCode: session.roomCode, isHost: true };
    }
  }
  return null;
}

function getRoomBySocket(socketId) {
  for (const s of rooms.values()) {
    if (s.hostSocketId === socketId || s.players.has(socketId)) return s;
  }
  return null;
}

function getRoom(roomCode) { return rooms.get(roomCode) || null; }

function setQuiz(roomCode, quiz) {
  const s = rooms.get(roomCode);
  if (!s) return false;
  s.quiz = quiz;
  return true;
}

// ─────────────────────────────────────────────
// Game Flow
// ─────────────────────────────────────────────
function startGame(roomCode) {
  const session = rooms.get(roomCode);
  if (!session) return { error: 'Room not found.' };
  if (session.gameState !== 'lobby') return { error: 'Already started.' };
  if (!session.quiz?.questions?.length) return { error: 'No quiz loaded.' };
  if (session.players.size === 0) return { error: 'No players yet.' };

  session.gameState = 'question';
  session.currentQuestionIndex = 0;
  session.answers.clear();
  session.questionStartTime = Date.now();
  return { success: true };
}

function submitAnswer(roomCode, socketId, answerIndex) {
  const session = rooms.get(roomCode);
  if (!session) return { error: 'Room not found.' };
  if (session.gameState !== 'question') return { locked: true };
  if (!session.players.has(socketId)) return { error: 'Player not found.' };
  if (session.answers.has(socketId)) return { alreadyAnswered: true };

  const responseTimeMs = Date.now() - session.questionStartTime;
  const question = session.quiz.questions[session.currentQuestionIndex];
  if (responseTimeMs > question.timeLimit * 1000) return { locked: true };

  session.answers.set(socketId, { answerIndex, responseTimeMs, timestamp: Date.now() });
  return { success: true, answeredCount: session.answers.size, totalPlayers: session.players.size };
}

function endQuestion(roomCode) {
  const session = rooms.get(roomCode);
  if (!session) return null;

  const question = session.quiz.questions[session.currentQuestionIndex];
  const correctIndex = question.answers.findIndex((a) => a.isCorrect);

  const playerResults = [];
  let roundTopScorer = null;
  let roundTopPoints = -1;

  if (session.isTeamMode) {
    for (const team of session.teams.values()) team._roundScore = 0;
  }

  for (const [socketId, player] of session.players.entries()) {
    const answer = session.answers.get(socketId);
    const isCorrect = answer ? answer.answerIndex === correctIndex : false;
    const currentStreak = session.streaks.get(socketId) || 0;

    const { points, speedBonus, streakBonus, streakTier } = calculateScore(
      isCorrect,
      question.timeLimit,
      answer?.responseTimeMs ?? question.timeLimit * 1000,
      currentStreak,
      question.pointsBase || BASE_POINTS
    );

    const newStreak = isCorrect ? currentStreak + 1 : 0;
    session.streaks.set(socketId, newStreak);
    session.maxStreaks.set(socketId, Math.max(session.maxStreaks.get(socketId) || 0, newStreak));

    if (isCorrect) {
      session.correctCounts.set(socketId, (session.correctCounts.get(socketId) || 0) + 1);
    }

    const prevScore = session.scores.get(socketId) || 0;
    const newScore  = prevScore + points;
    session.scores.set(socketId, newScore);
    player.score = newScore;

    if (session.isTeamMode && player.teamName && session.teams.has(player.teamName)) {
      const team = session.teams.get(player.teamName);
      team.score += points;
      team._roundScore = (team._roundScore || 0) + points;
    }

    const result = {
      socketId, name: player.name, teamName: player.teamName,
      answerIndex: answer?.answerIndex ?? null,
      isCorrect, points, speedBonus, streakBonus, streakTier,
      newStreak, totalScore: newScore,
      responseTimeMs: answer?.responseTimeMs ?? null,
    };
    playerResults.push(result);

    if (isCorrect && points > roundTopPoints) {
      roundTopPoints = points;
      roundTopScorer = { name: player.name, points, streakTier };
    }
  }

  const leaderboard     = buildLeaderboard(session);
  const teamLeaderboard = session.isTeamMode ? buildTeamLeaderboard(session) : null;

  const roundResult = {
    questionIndex: session.currentQuestionIndex,
    questionText: question.text,
    imageUrl: question.imageUrl || null,
    correctAnswerIndex: correctIndex,
    correctAnswerText: question.answers[correctIndex].text,
    playerResults, leaderboard, teamLeaderboard,
    roundTopScorer, totalAnswered: session.answers.size, totalPlayers: session.players.size,
  };

  session.roundHistory.push(roundResult);
  session.gameState = 'reveal';
  return roundResult;
}

function nextQuestion(roomCode) {
  const session = rooms.get(roomCode);
  if (!session) return null;

  const nextIndex = session.currentQuestionIndex + 1;
  if (nextIndex >= session.quiz.questions.length) {
    session.gameState = 'finished';
    return {
      gameOver: true,
      leaderboard: buildLeaderboard(session),
      teamLeaderboard: buildTeamLeaderboard(session),
    };
  }

  session.currentQuestionIndex = nextIndex;
  session.answers.clear();
  session.questionStartTime = Date.now();
  session.gameState = 'question';
  return { hasNext: true, questionIndex: nextIndex };
}

// ─────────────────────────────────────────────
// Data Accessors
// ─────────────────────────────────────────────
function buildLeaderboard(session) {
  if (!session) return [];
  const entries = [];
  for (const [socketId, player] of session.players.entries()) {
    entries.push({
      socketId, name: player.name,
      score: session.scores.get(socketId) || 0,
      teamName: player.teamName,
      streak: session.streaks.get(socketId) || 0,
      maxStreak: session.maxStreaks.get(socketId) || 0,
    });
  }
  entries.sort((a, b) => b.score - a.score);
  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}

function buildTeamLeaderboard(session) {
  if (!session?.isTeamMode) return null;
  return Array.from(session.teams.values())
    .map((t) => ({ name: t.name, color: t.color, score: t.score, memberCount: t.members.length }))
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

function getHostQuestionData(roomCode) {
  const session = rooms.get(roomCode);
  if (!session?.quiz) return null;
  const q = session.quiz.questions[session.currentQuestionIndex];
  if (!q) return null;
  return {
    questionIndex: session.currentQuestionIndex,
    totalQuestions: session.quiz.questions.length,
    questionText: q.text,
    imageUrl: q.imageUrl || null,
    answers: q.answers.map((a, i) => ({ text: a.text, index: i })),
    correctAnswerIndex: q.answers.findIndex((a) => a.isCorrect),
    timeLimit: q.timeLimit,
    pointsBase: q.pointsBase || BASE_POINTS,
    answeredCount: session.answers.size,
    totalPlayers: session.players.size,
    questionStartTime: session.questionStartTime,
    isTeamMode: session.isTeamMode,
  };
}

function getPlayerQuestionData(roomCode) {
  const session = rooms.get(roomCode);
  if (!session?.quiz) return null;
  const q = session.quiz.questions[session.currentQuestionIndex];
  if (!q) return null;
  return {
    questionIndex: session.currentQuestionIndex,
    totalQuestions: session.quiz.questions.length,
    answerCount: q.answers.length,
    timeLimit: q.timeLimit,
    questionStartTime: session.questionStartTime,
    isTeamMode: session.isTeamMode,
  };
}

function getPlayerList(roomCode) {
  const session = rooms.get(roomCode);
  if (!session) return [];
  return Array.from(session.players.values()).map((p) => ({
    name: p.name, socketId: p.socketId, isConnected: p.isConnected, teamName: p.teamName,
  }));
}

function getTeamList(roomCode) {
  const session = rooms.get(roomCode);
  if (!session?.isTeamMode) return [];
  return Array.from(session.teams.values()).map((t) => ({
    name: t.name, color: t.color, memberCount: t.members.length,
  }));
}

function getFinalStats(roomCode) {
  const session = rooms.get(roomCode);
  if (!session) return null;
  const results = [];
  for (const [socketId, player] of session.players.entries()) {
    results.push({
      name: player.name, teamName: player.teamName,
      score: session.scores.get(socketId) || 0,
      correctCount: session.correctCounts.get(socketId) || 0,
      totalQuestions: session.quiz?.questions?.length || 0,
      maxStreak: session.maxStreaks.get(socketId) || 0,
    });
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}

function deleteRoom(roomCode) { rooms.delete(roomCode); }

module.exports = {
  createRoom, joinRoom, removePlayer, getRoomBySocket, getRoom, setQuiz,
  startGame, submitAnswer, endQuestion, nextQuestion,
  buildLeaderboard, buildTeamLeaderboard,
  getHostQuestionData, getPlayerQuestionData,
  getPlayerList, getTeamList, getFinalStats, deleteRoom, TEAM_COLORS,
};
