/**
 * Sabnaya Backend – v2
 * Express + Socket.IO
 * New in v2: Quiz CRUD API, Team mode, Streaks, Image question support, Supabase persistence
 */

require('dotenv').config();
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const cors     = require('cors');
const multer   = require('multer');
const path     = require('path');

const gm       = require('./gameManager');
const repo     = require('./quizRepository');
const sampleQuizzes = require('./sampleQuiz');

const PORT         = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const ADMIN_SECRET  = process.env.ADMIN_SECRET || 'trivia-admin-secret'; // simple auth

// ─────────────────────────────────────────────
// Express + Socket.IO Setup
// ─────────────────────────────────────────────
const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Serve uploaded images from /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ─────────────────────────────────────────────
// Image Upload (multer – saves to disk; swap for S3 in production)
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fs = require('fs');
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5 MB

// ─────────────────────────────────────────────
// Middleware – simple admin auth
// ─────────────────────────────────────────────
function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (secret !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ─────────────────────────────────────────────
// REST API – Public
// ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0' });
});

app.get('/api/quizzes', async (req, res) => {
  try {
    const quizzes = await repo.listQuizzes();
    res.json(quizzes);
  } catch (e) {
    console.error('[API] listQuizzes error:', e.message);
    res.json(sampleQuizzes.map((q) => ({ id: q.id, title: q.title, questionCount: q.questions.length })));
  }
});

app.get('/api/quizzes/:id', async (req, res) => {
  try {
    const quiz = await repo.getQuiz(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json(quiz);
  } catch (e) {
    const fallback = sampleQuizzes.find((q) => q.id === req.params.id);
    if (fallback) return res.json(fallback);
    res.status(404).json({ error: 'Quiz not found' });
  }
});

// ─────────────────────────────────────────────
// REST API – Admin (require ADMIN_SECRET header)
// ─────────────────────────────────────────────

// Create quiz
app.post('/api/admin/quizzes', adminAuth, async (req, res) => {
  try {
    const { title, description, isPublic } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const quiz = await repo.createQuiz({ title, description, isPublic });
    res.status(201).json(quiz);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update quiz metadata
app.put('/api/admin/quizzes/:id', adminAuth, async (req, res) => {
  try {
    const updated = await repo.updateQuiz(req.params.id, req.body);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete quiz
app.delete('/api/admin/quizzes/:id', adminAuth, async (req, res) => {
  try {
    await repo.deleteQuiz(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add question to quiz
app.post('/api/admin/quizzes/:quizId/questions', adminAuth, async (req, res) => {
  try {
    const { text, imageUrl, timeLimit, pointsBase, orderIndex, answers } = req.body;
    if (!text || !answers || answers.length !== 4) {
      return res.status(400).json({ error: 'text and exactly 4 answers required' });
    }
    const q = await repo.createQuestion(req.params.quizId, { text, imageUrl, timeLimit, pointsBase, orderIndex, answers });
    res.status(201).json(q);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update question
app.put('/api/admin/questions/:id', adminAuth, async (req, res) => {
  try {
    const q = await repo.updateQuestion(req.params.id, req.body);
    res.json(q);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete question
app.delete('/api/admin/questions/:id', adminAuth, async (req, res) => {
  try {
    await repo.deleteQuestion(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reorder questions
app.patch('/api/admin/quizzes/:quizId/reorder', adminAuth, async (req, res) => {
  try {
    await repo.reorderQuestions(req.params.quizId, req.body.orderedIds);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upload image for a question
app.post('/api/admin/upload', adminAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ imageUrl, filename: req.file.filename });
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function emitToRoom(roomCode, event, data)   { io.to(roomCode).emit(event, data); }
function emitToSocket(socketId, event, data) { io.to(socketId).emit(event, data); }

// ─────────────────────────────────────────────
// Question Timer
// ─────────────────────────────────────────────
const timers = new Map();

function startQuestionTimer(roomCode, timeLimit) {
  stopQuestionTimer(roomCode);
  let timeRemaining = timeLimit;
  emitToRoom(roomCode, 'timer_tick', { timeRemaining });

  const interval = setInterval(() => {
    timeRemaining--;
    emitToRoom(roomCode, 'timer_tick', { timeRemaining });
    if (timeRemaining <= 0) {
      stopQuestionTimer(roomCode);
      handleQuestionEnd(roomCode);
    }
  }, 1000);

  timers.set(roomCode, { interval, timeRemaining });
}

function stopQuestionTimer(roomCode) {
  const t = timers.get(roomCode);
  if (t) { clearInterval(t.interval); timers.delete(roomCode); }
}

function handleQuestionEnd(roomCode) {
  const room = gm.getRoom(roomCode);
  if (!room || room.gameState !== 'question') return;

  const roundResult = gm.endQuestion(roomCode);
  if (!roundResult) return;

  // Shared reveal info (all clients)
  emitToRoom(roomCode, 'question_ended', {
    correctAnswerIndex: roundResult.correctAnswerIndex,
    correctAnswerText: roundResult.correctAnswerText,
    totalAnswered: roundResult.totalAnswered,
    totalPlayers: roundResult.totalPlayers,
    roundTopScorer: roundResult.roundTopScorer
      ? { name: roundResult.roundTopScorer.name, points: roundResult.roundTopScorer.points, streakTier: roundResult.roundTopScorer.streakTier }
      : null,
  });

  // Host-only: full detail
  emitToSocket(room.hostSocketId, 'host_question_ended', roundResult);

  // Per-player results (includes streak info)
  for (const pr of roundResult.playerResults) {
    emitToSocket(pr.socketId, 'player_question_result', {
      yourAnswerIndex: pr.answerIndex,
      isCorrect: pr.isCorrect,
      points: pr.points,
      speedBonus: pr.speedBonus,
      streakBonus: pr.streakBonus,
      streakTier: pr.streakTier,
      newStreak: pr.newStreak,
      totalScore: pr.totalScore,
      correctAnswerIndex: roundResult.correctAnswerIndex,
    });
  }

  // Leaderboard (shared)
  emitToRoom(roomCode, 'leaderboard_updated', {
    leaderboard: roundResult.leaderboard,
    teamLeaderboard: roundResult.teamLeaderboard,
  });
}

// ─────────────────────────────────────────────
// Broadcast question
// ─────────────────────────────────────────────
function broadcastQuestion(roomCode, hostSocketId) {
  const hostData   = gm.getHostQuestionData(roomCode);
  const playerData = gm.getPlayerQuestionData(roomCode);
  if (!hostData || !playerData) return;

  console.log(`[Q] ${roomCode} → Q${hostData.questionIndex + 1}: ${hostData.questionText.substring(0, 40)}`);

  emitToSocket(hostSocketId, 'question_started', { ...hostData, isHost: true });

  const room = gm.getRoom(roomCode);
  for (const [sid] of room.players.entries()) {
    emitToSocket(sid, 'question_started', { ...playerData, isHost: false });
  }

  startQuestionTimer(roomCode, hostData.timeLimit);
}

// ─────────────────────────────────────────────
// Socket.IO Events
// ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);

  // ── CREATE ROOM ──────────────────────────────
  socket.on('create_room', async ({ quizId, isTeamMode = false } = {}) => {
    let quiz;
    try {
      quiz = quizId ? await repo.getQuiz(quizId) : null;
    } catch (_) {}
    if (!quiz) quiz = sampleQuizzes.find((q) => q.id === quizId) || sampleQuizzes[0];

    const roomCode = gm.createRoom(socket.id, quiz, { isTeamMode });
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.role     = 'host';

    socket.emit('room_created', {
      roomCode,
      quizTitle: quiz.title,
      quizId: quiz.id,
      questionCount: quiz.questions.length,
      isTeamMode,
      teamList: isTeamMode ? gm.getTeamList(roomCode) : [],
    });
  });

  // ── JOIN ROOM ────────────────────────────────
  socket.on('join_room', ({ roomCode, playerName, teamName }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const result = gm.joinRoom(code, socket.id, playerName, teamName);

    if (result.error) { socket.emit('join_error', { message: result.error }); return; }

    socket.join(code);
    socket.data.roomCode    = code;
    socket.data.role        = 'player';
    socket.data.playerName  = playerName;

    socket.emit('join_success', { roomCode: code, playerName: result.player.name, teamName: result.player.teamName });

    const room = gm.getRoom(code);
    emitToRoom(code, 'player_joined', {
      playerName: result.player.name,
      teamName: result.player.teamName,
      playerList: gm.getPlayerList(code),
      teamList: room?.isTeamMode ? gm.getTeamList(code) : [],
    });
  });

  // ── START GAME ───────────────────────────────
  socket.on('start_game', () => {
    const roomCode = socket.data.roomCode;
    const room = gm.getRoom(roomCode);
    if (!room || room.hostSocketId !== socket.id) { socket.emit('error', { message: 'Not authorized.' }); return; }

    const result = gm.startGame(roomCode);
    if (result.error) { socket.emit('error', { message: result.error }); return; }

    emitToRoom(roomCode, 'game_started', { roomCode, isTeamMode: room.isTeamMode });
    broadcastQuestion(roomCode, room.hostSocketId);
  });

  // ── SUBMIT ANSWER ────────────────────────────
  socket.on('submit_answer', ({ answerIndex }) => {
    const roomCode = socket.data.roomCode;
    const result = gm.submitAnswer(roomCode, socket.id, answerIndex);

    if (result.locked || result.alreadyAnswered) { socket.emit('answer_locked', {}); return; }
    if (result.error) { socket.emit('error', { message: result.error }); return; }

    socket.emit('answer_received', { answerIndex });

    const room = gm.getRoom(roomCode);
    emitToSocket(room.hostSocketId, 'answer_count_updated', {
      answeredCount: result.answeredCount,
      totalPlayers: result.totalPlayers,
    });

    if (result.answeredCount >= result.totalPlayers) {
      stopQuestionTimer(roomCode);
      handleQuestionEnd(roomCode);
    }
  });

  // ── NEXT QUESTION ────────────────────────────
  socket.on('next_question', () => {
    const roomCode = socket.data.roomCode;
    const room = gm.getRoom(roomCode);
    if (!room || room.hostSocketId !== socket.id) return;

    const result = gm.nextQuestion(roomCode);
    if (result.gameOver) {
      const finalStats = gm.getFinalStats(roomCode);

      // Persist results
      try {
        repo.saveGameSession({
          roomCode,
          quizId: room.quiz?.id,
          quizTitle: room.quiz?.title,
          playerResults: finalStats,
          isTeamMode: room.isTeamMode,
        });
      } catch (_) {}

      emitToRoom(roomCode, 'game_finished', {
        leaderboard: result.leaderboard,
        teamLeaderboard: result.teamLeaderboard,
        podium: result.leaderboard.slice(0, 3),
        stats: finalStats,
      });
      return;
    }

    broadcastQuestion(roomCode, room.hostSocketId);
  });

  // ── END GAME EARLY ───────────────────────────
  socket.on('end_game', () => {
    const roomCode = socket.data.roomCode;
    const room = gm.getRoom(roomCode);
    if (!room || room.hostSocketId !== socket.id) return;
    stopQuestionTimer(roomCode);
    const leaderboard = gm.buildLeaderboard(room);
    emitToRoom(roomCode, 'game_finished', {
      leaderboard,
      teamLeaderboard: gm.buildTeamLeaderboard(room),
      podium: leaderboard.slice(0, 3),
      earlyEnd: true,
    });
  });

  // ── DISCONNECT ───────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id}`);
    const info = gm.removePlayer(socket.id);
    if (!info) return;

    if (info.isHost) {
      emitToRoom(info.roomCode, 'host_disconnected', { message: 'The host disconnected.' });
      stopQuestionTimer(info.roomCode);
    } else {
      const room = gm.getRoom(info.roomCode);
      emitToRoom(info.roomCode, 'player_left', {
        playerName: info.playerName,
        playerList: gm.getPlayerList(info.roomCode),
        teamList: room?.isTeamMode ? gm.getTeamList(info.roomCode) : [],
      });
    }
  });

  // ── RECONNECT ────────────────────────────────
  socket.on('reconnect_player', ({ roomCode, playerName }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = gm.getRoom(code);
    if (!room) { socket.emit('join_error', { message: 'Room no longer exists.' }); return; }

    let found = null;
    for (const p of room.players.values()) {
      if (p.name.toLowerCase() === playerName.toLowerCase() && !p.isConnected) { found = p; break; }
    }
    if (!found) { socket.emit('join_error', { message: 'Could not reconnect.' }); return; }

    room.players.delete(found.socketId);
    found.socketId = socket.id;
    found.isConnected = true;
    room.players.set(socket.id, found);

    socket.join(code);
    socket.data.roomCode   = code;
    socket.data.role       = 'player';
    socket.data.playerName = playerName;

    socket.emit('reconnected', {
      roomCode: code,
      playerName: found.name,
      currentScore: room.scores.get(socket.id) || 0,
      gameState: room.gameState,
      teamName: found.teamName,
    });
  });
});

// ─────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🎮 Sabnaya v2 running on http://localhost:${PORT}`);
  console.log(`   CORS: ${CLIENT_ORIGIN}`);
  console.log(`   Admin secret: ${ADMIN_SECRET.substring(0,4)}****`);
});
