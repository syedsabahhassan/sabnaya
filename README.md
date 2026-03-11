# 🎮 Sabnaya — Real-Time Multiplayer Trivia

A Kahoot-style real-time multiplayer trivia platform built with **React + Node.js + Socket.IO**.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENTS                          │
│                                                         │
│   Host Browser              Player Browser(s)           │
│   ┌──────────────┐          ┌──────────────┐            │
│   │  HostView    │          │  PlayerView  │            │
│   │  - Question  │          │  - 4 Tiles   │            │
│   │  - Timer     │          │  - No text   │            │
│   │  - Scores    │          │  - Results   │            │
│   └──────┬───────┘          └──────┬───────┘            │
└──────────┼────────────────────────┼────────────────────┘
           │  Socket.IO (WebSocket) │
┌──────────┼────────────────────────┼────────────────────┐
│          ▼          SERVER        ▼                     │
│   ┌─────────────────────────────────────┐              │
│   │            server.js                │              │
│   │       Express + Socket.IO           │              │
│   │  - Routes socket events to GM       │              │
│   │  - Manages server-side timers       │              │
│   │  - Broadcasts to room vs socket     │              │
│   └──────────────┬──────────────────────┘              │
│                  │                                      │
│   ┌──────────────▼──────────────────────┐              │
│   │          gameManager.js             │              │
│   │   In-Memory Game State (Map)        │              │
│   │  - Room creation & player mgmt      │              │
│   │  - Server-side scoring logic        │              │
│   │  - Question progression             │              │
│   └─────────────────────────────────────┘              │
│                                                         │
│   ┌─────────────────────────────────────┐              │
│   │          sampleQuiz.js              │              │
│   │  - Quiz/question bank               │              │
│   └─────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────┘
```

### Key Architecture Decisions

**1. Server is Source of Truth**
All timing, scoring, and correctness validation happens server-side. Clients cannot manipulate scores. The `questionStartTime` is set on the server when a question starts, and all answer timestamps are measured server-side.

**2. Differential Broadcasting**
The server sends different event payloads to the host vs. players. Specifically:
- `question_started` → host receives question text + labeled answers; players receive only answer count + time limit
- `host_question_ended` → host-only event with full round detail
- `player_question_result` → individual event per player with their personal result

**3. In-Memory State**
For the MVP, all game state lives in Node.js memory (a `Map` of room codes to sessions). This is fast and simple. For production, replace with Redis or PostgreSQL.

**4. Socket Rooms**
Socket.IO's native room feature is used so `io.to(roomCode).emit(...)` targets exactly the right clients.

---

## Real-Time Event Flow

### Creating & Joining

```
Host                    Server                    Player
 |                        |                          |
 |-- create_room -------->|                          |
 |<-- room_created -------|                          |
 |                        |                          |
 |                        |<---- join_room ----------|
 |<-- player_joined ------|---> join_success ------->|
```

### Gameplay

```
Host                    Server                    Players
 |                        |                          |
 |-- start_game --------->|                          |
 |                        |--- game_started -------->|
 |<-- question_started ---|--- question_started ---->|
 |   (with text+answers)  |   (NO text, tiles only)  |
 |<-- timer_tick ------------- timer_tick ---------->|
 |<-- answer_count_updated|                          |
 |                        |<---- submit_answer ------|
 |                        |--- answer_received ------>|
 |                        |                          |
 |  (timer expires or all answered)                  |
 |<-- host_question_ended-|--- question_ended ------>|
 |                        |--- player_question_result>|
 |                        |--- leaderboard_updated -->|
 |                        |                          |
 |-- next_question ------>|                          |
 |   (repeat...)          |                          |
 |                        |                          |
 |-- next_question ------>| (last question)          |
 |                        |--- game_finished -------->|
```

### Scoring Formula

```
Base Points:   500 (for correct answer)
Speed Bonus:   up to 500 extra points

speedRatio  = 1 - (responseTimeMs / timeLimitMs)
speedBonus  = round(500 × speedRatio)
totalScore  = 500 + speedBonus   (if correct)
totalScore  = 0                  (if wrong or no answer)

Maximum:  1000 points per question
Minimum:  1 point (correct answer at last moment)
```

---

## Project Structure

```
trivia-app/
├── backend/
│   ├── server.js          # Express + Socket.IO server, event handlers
│   ├── gameManager.js     # Game state, scoring logic
│   ├── sampleQuiz.js      # Quiz/question bank data
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── main.jsx
│       ├── App.jsx        # Root state machine (useReducer)
│       ├── App.css        # Global styles
│       ├── socket.js      # Socket.IO client singleton
│       └── components/
│           ├── LandingPage.jsx   # Home: Host or Join
│           ├── HostView.jsx      # All host screens
│           ├── PlayerView.jsx    # All player screens
│           └── shared/
│               ├── Timer.jsx         # Countdown bar + number
│               └── Leaderboard.jsx   # Ranked player list
│
└── README.md
```

---

## Setup & Running

### Prerequisites

- Node.js 18+ (https://nodejs.org)
- npm 9+

### 1. Backend

```bash
cd trivia-app/backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev

# Or production:
npm start
```

Backend runs at: `http://localhost:3001`

### 2. Frontend

```bash
cd trivia-app/frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start dev server
npm run dev
```

Frontend runs at: `http://localhost:5173`

### 3. Playing the Game

1. Open `http://localhost:5173` in your browser
2. Click **Host a Game** — choose a quiz, click **Create Room**
3. Share the 6-character **Game PIN** with players
4. Players open `http://localhost:5173` on their devices, click **Join a Game**, enter the PIN + their name
5. Once players have joined, the host clicks **Start Game**
6. Players see 4 colored answer tiles; host sees questions and controls
7. After each question, scores and leaderboard are shown
8. At the end, a podium screen shows 🥇🥈🥉

---

## Environment Variables

### Backend (`backend/.env`)

| Variable       | Default                   | Description                     |
|----------------|---------------------------|---------------------------------|
| `PORT`         | `3001`                    | HTTP server port                |
| `CLIENT_ORIGIN`| `http://localhost:5173`   | Frontend origin for CORS        |

### Frontend (`frontend/.env`)

| Variable          | Default                   | Description              |
|-------------------|---------------------------|--------------------------|
| `VITE_SERVER_URL` | `http://localhost:3001`   | Backend Socket.IO URL    |

---

## Data Model

### In-Memory Game Session
```js
{
  roomCode: "ABC123",
  hostSocketId: "socket_id",
  quiz: { id, title, questions: [...] },
  gameState: "lobby | question | reveal | leaderboard | finished",
  currentQuestionIndex: 0,
  questionStartTime: Date.now(),   // server-side timestamp
  answers: Map(socketId → { answerIndex, responseTimeMs, timestamp }),
  players: Map(socketId → { socketId, name, score, isConnected }),
  scores: Map(socketId → totalScore),
  roundHistory: [],
}
```

### Question
```js
{
  id: "q1",
  text: "What is the capital of France?",
  answers: [
    { text: "London",  isCorrect: false },
    { text: "Berlin",  isCorrect: false },
    { text: "Paris",   isCorrect: true  },
    { text: "Madrid",  isCorrect: false },
  ],
  timeLimit: 20,   // seconds
  order: 0,
}
```

---

## Screens

| Screen | Who sees it | Description |
|--------|-------------|-------------|
| Landing Page | Everyone | Choose Host or Join |
| Host Setup | Host | Select quiz, create room |
| Host Lobby | Host | Shows PIN, QR code, joined players |
| Player Join | Player | Enter PIN + name |
| Player Waiting Room | Player | Waiting for host to start |
| Host Question | Host | Question text + 4 labeled tiles + timer |
| Player Answer | Player | 4 large colored tiles ONLY (no question text) |
| Host Reveal | Host | Shows correct answer + round top scorer |
| Player Result | Player | Shows if correct + points earned |
| Leaderboard | All | Current standings |
| Final Podium | All | 🥇🥈🥉 with full score list |

---

## Adding Your Own Quiz

Edit `backend/sampleQuiz.js` and add a new quiz object:

```js
{
  id: 'my-quiz',
  title: 'My Custom Quiz',
  description: 'Optional description',
  questions: [
    {
      id: 'q1',
      text: 'Your question here?',
      answers: [
        { text: 'Option A', isCorrect: false },
        { text: 'Option B', isCorrect: true },
        { text: 'Option C', isCorrect: false },
        { text: 'Option D', isCorrect: false },
      ],
      timeLimit: 20,
      order: 0,
    },
    // ... more questions
  ],
}
```

---

## Accessibility

Answer tiles use **both color AND shape** so color-blind players can still identify them:

| Tile | Color  | Shape    |
|------|--------|----------|
| A    | 🔴 Red    | ▲ Triangle |
| B    | 🔵 Blue   | ◆ Diamond  |
| C    | 🟠 Orange | ● Circle   |
| D    | 🟢 Green  | ■ Square   |

---

## Production Deployment

### Backend (e.g., Railway, Render, Fly.io)
```bash
# Set environment variables in your hosting platform:
PORT=3001
CLIENT_ORIGIN=https://your-frontend-domain.com

npm start
```

### Frontend (e.g., Vercel, Netlify)
```bash
# Set environment variable:
VITE_SERVER_URL=https://your-backend-domain.com

npm run build
# Deploy the dist/ folder
```

### Database (Future)
To add persistence, replace the in-memory `rooms` Map in `gameManager.js` with a Redis store or PostgreSQL. The interface is already abstracted so the swap is minimal.

---

## Future Enhancements

- Admin panel for creating/editing quizzes (UI for adding questions)
- Persistent quiz storage (PostgreSQL / Supabase)
- User accounts and game history
- Mobile app (React Native) using the same backend
- Sound effects and animations
- Custom time limits per question
- Image questions
- Team mode
- Streaks and combo bonuses
