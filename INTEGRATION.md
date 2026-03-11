# Sabnaya — Integration & Setup Guide

> Full-stack real-time multiplayer trivia (Kahoot-style)
> Stack: Node.js + Socket.IO (backend) · React + Vite (web frontend) · React Native + Expo (mobile)

---

## Project Structure

```
trivia-app/
├── backend/                  Node.js + Express + Socket.IO server
│   ├── server.js             Main entry point, all socket & REST routes
│   ├── gameManager.js        In-memory game state, scoring, streaks, teams
│   ├── db.js                 Supabase client (graceful fallback if no creds)
│   ├── quizRepository.js     Quiz CRUD via Supabase (falls back to sampleQuiz)
│   ├── sampleQuiz.js         Built-in demo quizzes (works with no DB)
│   ├── migrations/
│   │   └── 001_schema.sql    PostgreSQL schema + seed data for Supabase
│   └── .env.example
│
├── frontend/                 React + Vite web app
│   ├── src/
│   │   ├── App.jsx           Root component (useReducer state machine)
│   │   ├── socket.js         Socket.IO client singleton
│   │   └── components/
│   │       ├── LandingPage.jsx
│   │       ├── HostView.jsx       Host all phases: setup → lobby → question → reveal → podium
│   │       ├── PlayerView.jsx     Player all phases: join → wait → answer → result → podium
│   │       └── AdminPanel/
│   │           ├── index.jsx      Auth gate + view router
│   │           ├── QuizList.jsx   List all quizzes
│   │           └── QuizEditor.jsx Create/edit quizzes + questions
│   └── .env.example
│
└── mobile/                   React Native (Expo) app — same backend
    ├── App.js                Root with font loading + GameProvider
    ├── src/
    │   ├── context/GameContext.js    Game state provider
    │   ├── hooks/
    │   │   ├── useGameSocket.js      Full socket hook (useReducer)
    │   │   └── useSound.js           expo-av audio hook
    │   ├── navigation/AppNavigator.js
    │   ├── components/
    │   │   ├── AnswerTile.js         Animated tile + haptics
    │   │   ├── TimerBar.js           Animated countdown bar
    │   │   ├── StreakBadge.js        Animated streak indicator
    │   │   └── Leaderboard.js
    │   ├── screens/
    │   │   ├── LandingScreen.js
    │   │   ├── JoinScreen.js         Room code + name + optional team
    │   │   ├── WaitingScreen.js      Lobby waiting room
    │   │   ├── AnswerScreen.js       Core gameplay (2×2 tile grid)
    │   │   ├── ResultScreen.js       Per-question result + score breakdown
    │   │   ├── LeaderboardScreen.js
    │   │   └── FinalScreen.js        Podium + full final leaderboard
    │   └── constants/theme.js        Colors, shapes, team colors
    └── .env.example
```

---

## 1. Backend Setup

```bash
cd backend
cp .env.example .env       # Edit with your values
npm install
npm run dev                # Starts with nodemon on port 3001
```

### Environment variables (`backend/.env`)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `PORT` | No | `3001` | HTTP + Socket.IO port |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | CORS allowed origin |
| `ADMIN_SECRET` | No | `trivia-admin-secret` | Password for admin panel |
| `SUPABASE_URL` | No | — | Skip = use in-memory quiz data |
| `SUPABASE_SERVICE_KEY` | No | — | Service role key (not anon key) |

Without Supabase credentials the server runs fully in-memory using `sampleQuiz.js`. This is fine for development and demos.

---

## 2. Web Frontend Setup

```bash
cd frontend
cp .env.example .env       # Edit VITE_SERVER_URL if backend isn't on localhost
npm install
npm run dev                # Vite dev server on port 5173
```

### Environment variables (`frontend/.env`)

| Variable | Default | Notes |
|---|---|---|
| `VITE_SERVER_URL` | `http://localhost:3001` | Backend URL |
| `VITE_ADMIN_SECRET` | `trivia-admin-secret` | Must match backend `ADMIN_SECRET` |

Open `http://localhost:5173` — the landing page shows three options: **Host a Game**, **Join a Game**, and **Admin Panel**.

---

## 3. Mobile (Expo) Setup

```bash
cd mobile
cp .env.example .env
npm install
npx expo start             # Opens Expo dev tools
```

Scan the QR code with **Expo Go** (iOS or Android) to test on a real device.

### Environment variables (`mobile/.env`)

| Variable | Required | Notes |
|---|---|---|
| `EXPO_PUBLIC_SERVER_URL` | **Yes** | Must be your computer's LAN IP, e.g. `http://192.168.1.42:3001`. `localhost` won't work on a real device. |

**Finding your LAN IP:**
- macOS: `ipconfig getifaddr en0`
- Windows: `ipconfig` → look for IPv4 Address
- Linux: `ip route get 1` → src address

The mobile app shares 100% of the same backend and socket events as the web frontend — both can be used simultaneously in the same game.

---

## 4. Supabase Setup (Optional, for persistent quizzes)

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migration in **SQL Editor**: paste the contents of `backend/migrations/001_schema.sql`
3. Copy your **Project URL** and **Service Role Key** (Settings → API) into `backend/.env`
4. Restart the backend — you'll see `[DB] Supabase connected` instead of the fallback warning

The `quizRepository.js` file handles all CRUD. When Supabase is connected:
- The Admin Panel saves quizzes to the database
- Quizzes persist across server restarts
- Image uploads are stored in `backend/uploads/` (swap for S3 in production)

---

## 5. Game Flow & Architecture

### Socket events reference

| Direction | Event | Payload |
|---|---|---|
| Client → Server | `create_room` | `{ quizId, isTeamMode }` |
| Server → Host | `room_created` | `{ roomCode, quizTitle, questionCount, isTeamMode, teamList }` |
| Client → Server | `join_room` | `{ roomCode, playerName, teamName? }` |
| Server → Player | `join_success` | `{ roomCode, playerName, teamName? }` |
| Server → Host | `player_joined` | `{ playerList, teamList }` |
| Client → Server | `start_game` | — |
| Server → All | `game_started` | — |
| Server → Host | `question_started` | `{ isHost:true, questionText, answers[], correctAnswerIndex, imageUrl?, timeLimit, pointsBase, … }` |
| Server → Player | `question_started` | `{ isHost:false, answerCount, timeLimit, questionIndex, totalQuestions }` |
| Server → All | `timer_tick` | `{ timeRemaining }` |
| Client → Server | `submit_answer` | `{ answerIndex }` |
| Server → Player | `player_question_result` | `{ isCorrect, points, speedBonus, streakBonus, streakTier, newStreak, totalScore, correctAnswerIndex }` |
| Server → Host | `host_question_ended` | `{ correctAnswerIndex, answerBreakdown[], topScorers[] }` |
| Server → All | `leaderboard_updated` | `{ leaderboard[], teamLeaderboard? }` |
| Client → Server | `next_question` | — (host only) |
| Server → All | `game_finished` | `{ leaderboard[] }` |

### Scoring formula

```
points = pointsBase + speedBonus + streakBonus

pointsBase  = per-question setting (default 500)
speedBonus  = Math.round(500 × (1 − timeUsedMs / timeLimitMs))   // max 500
streakBonus = streak ≥ 2 → 50 | ≥ 3 → 100 | ≥ 4 → 150 | ≥ 5 → 200

Maximum score per question: ~1200 (with full streak)
```

**Important:** All timing is server-side. `responseTimeMs` is calculated as `Date.now() − questionStartTime` on the server. Clients never send timestamps.

### Team mode

When `isTeamMode: true` is passed to `create_room`:
- Four teams are created: Red (▲), Blue (◆), Green (■), Yellow
- Players self-select a team in the join flow
- Individual scores aggregate to team totals
- `leaderboard_updated` includes a `teamLeaderboard` array alongside individual scores

---

## 6. Admin Panel

Access at `/` → **Admin Panel** (or navigate to the landing page and click the button).

Default password: `trivia-admin-secret` (set by `VITE_ADMIN_SECRET` / `ADMIN_SECRET`).

Features:
- Create, edit, and delete quizzes
- Add/remove/reorder questions with ↑↓ buttons
- Per-question: time limit (5–120 s), base points (100–2000), image upload
- Four answer options per question with correct-answer toggle

Admin API endpoints (require `x-admin-secret` header):

```
GET    /api/quizzes                  List all quizzes
POST   /api/admin/quizzes            Create quiz
PUT    /api/admin/quizzes/:id        Update quiz metadata
DELETE /api/admin/quizzes/:id        Soft-delete quiz
POST   /api/admin/quizzes/:id/questions          Add question
PUT    /api/admin/quizzes/:quizId/questions/:qId Update question
DELETE /api/admin/quizzes/:quizId/questions/:qId Delete question
PATCH  /api/admin/quizzes/:quizId/reorder        Reorder questions
POST   /api/admin/upload             Upload question image (multipart/form-data)
```

---

## 7. Running Everything Together

```bash
# Terminal 1 — Backend
cd trivia-app/backend && npm run dev

# Terminal 2 — Web Frontend
cd trivia-app/frontend && npm run dev

# Terminal 3 — Mobile (optional)
cd trivia-app/mobile && npx expo start
```

Then open two browser tabs:
1. `http://localhost:5173` → click **Host a Game**, pick a quiz, create room
2. `http://localhost:5173` → click **Join a Game**, enter the PIN shown on the host screen

The host controls the game pace (Next Question button); players answer on their own screen/device.

---

## 8. Production Deployment Notes

- **Backend**: Deploy to Railway, Render, or any Node host. Set `CLIENT_ORIGIN` to your frontend URL. Replace `multer` disk storage with S3/Cloudflare R2 for image uploads.
- **Frontend**: `npm run build` → deploy `dist/` to Vercel, Netlify, or similar. Set `VITE_SERVER_URL` to your backend URL.
- **Mobile**: Build a standalone APK/IPA with `eas build`. Set `EXPO_PUBLIC_SERVER_URL` to your production backend URL.
- **Database**: The Supabase free tier is sufficient for most use cases. Consider enabling Row Level Security (RLS) on the `quizzes` table for multi-user scenarios.
- **Secrets**: Rotate `ADMIN_SECRET` before going live. Consider replacing the simple shared-secret admin auth with proper JWT authentication.
