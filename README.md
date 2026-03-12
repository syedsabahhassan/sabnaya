# 🎮 SabahLabs — Real-Time Multiplayer Quiz Platform

A live, real-time multiplayer quiz platform where a **host** runs the game from a browser and **players** join on any device using a PIN or QR code. The host screen shows every question and answer; players see only four coloured tiles to tap — keeping the game fast, social, and screen-independent.

**Live URLs**
- 🌐 Web App: [sabahlabs-frontend.vercel.app](https://sabahlabs-frontend.vercel.app)
- ⚙️ Backend API: [sabahlabs-backend-production.up.railway.app](https://sabahlabs-backend-production.up.railway.app)
- 📱 iOS App: `com.sabahlabs.app` *(App Store submission in progress)*

---

## How It Works

1. **Host** opens the web app, signs into the Admin Panel, creates or imports a quiz
2. Host clicks **Host a Game**, selects a quiz, and a room is created with a unique **6-digit PIN**
3. **Players** open the web app (or iOS app) on their phones, enter the PIN and their name
4. Host starts the game — questions appear on the **host screen** (projector / laptop)
5. Players tap one of **four coloured shape tiles** on their device to answer
6. Server scores each answer server-side based on correctness + speed
7. After each question the host sees the correct answer and a mini-leaderboard
8. At the end a **podium screen** shows the top 3 players 🥇🥈🥉

### Current Limitation — Mobile Players
On the **iOS mobile app**, players see only the four answer tiles (▲ ◆ ● ■). Question text and answer labels are intentionally shown only on the host screen. This is by design — the host display (TV / projector / laptop) is the single source of the question. The mobile app is a response device, not a reading device.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 4, Socket.IO Client, qrcode.react |
| **Backend** | Node.js, Express 4, Socket.IO 4 |
| **Database** | PostgreSQL (Railway managed) |
| **Real-time** | WebSockets via Socket.IO |
| **Mobile** | React Native, Expo SDK 54, Expo Router |
| **Frontend Hosting** | Vercel |
| **Backend Hosting** | Railway |

---

## Project Structure

```
trivia-app/
├── backend/
│   ├── server.js           # Express + Socket.IO server, all API routes
│   ├── gameManager.js      # In-memory game state, scoring engine
│   ├── quizRepository.js   # PostgreSQL CRUD for quizzes & questions
│   ├── db.js               # PostgreSQL pool + auto schema init
│   ├── sampleQuiz.js       # Fallback quiz data (used when DB not connected)
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
│       ├── App.jsx              # Root state machine (useReducer)
│       ├── App.css              # Global styles + CSS variables
│       ├── socket.js            # Socket.IO client singleton
│       └── components/
│           ├── LandingPage.jsx      # Home: Host, Join, or Admin
│           ├── HostView.jsx         # All host screens (setup → lobby → game → podium)
│           ├── PlayerView.jsx       # All player screens (join → wait → answer → result)
│           ├── AdminPanel/
│           │   ├── index.jsx        # Auth gate, quiz list, JSON import
│           │   ├── QuizEditor.jsx   # Create/edit quiz with questions
│           │   └── QuizList.jsx     # List of saved quizzes
│           └── shared/
│               ├── Timer.jsx        # Countdown bar + number
│               └── Leaderboard.jsx  # Ranked player list
│
├── mobile/
│   ├── App.js                   # Root: SafeAreaProvider + Navigator
│   ├── app.json                 # Expo config (bundle ID, slug, version)
│   ├── eas.json                 # EAS Build profiles
│   ├── package.json
│   └── src/
│       ├── context/
│       │   └── GameContext.js   # Global Socket.IO state
│       ├── hooks/
│       │   └── useSound.js      # Sound stub (no-op in current build)
│       ├── constants/
│       │   └── theme.js         # Colours, fonts
│       ├── navigation/
│       │   └── AppNavigator.js  # React Navigation stack
│       ├── components/
│       │   └── AnswerTile.js    # Responsive coloured shape tile
│       └── screens/
│           ├── LandingScreen.js    # Join button + connection indicator
│           ├── JoinScreen.js       # Enter PIN + name
│           ├── WaitingScreen.js    # Lobby: waiting for host to start
│           ├── AnswerScreen.js     # 4 tile answer interface
│           ├── ResultScreen.js     # Correct/wrong + points earned
│           ├── LeaderboardScreen.js # Mid-game standings
│           └── FinalScreen.js      # Game over + final rank
│
├── quiz-template.json        # Sample JSON format for quiz import
├── README.md
└── ARCHITECTURE.md           # Full technical architecture reference
```

---

## Admin Panel

The Admin Panel is accessible at `/` → click **Admin Panel** (password protected).

**Default password:** set via `VITE_ADMIN_SECRET` environment variable on Vercel.

| Feature | Description |
|---|---|
| **Create Quiz** | Build a quiz question by question with a rich form editor |
| **Edit Quiz** | Modify any existing quiz and its questions |
| **Delete Quiz** | Soft-delete (marked inactive, not permanently removed) |
| **Import JSON** | Upload a `.json` file to bulk-create a quiz — see format below |

### Quiz JSON Import Format

```json
{
  "title": "My Quiz Title",
  "description": "Optional description",
  "isPublic": true,
  "questions": [
    {
      "text": "Question text?",
      "timeLimit": 20,
      "pointsBase": 500,
      "answers": [
        { "text": "Wrong answer", "isCorrect": false },
        { "text": "Right answer", "isCorrect": true  },
        { "text": "Wrong answer", "isCorrect": false },
        { "text": "Wrong answer", "isCorrect": false }
      ]
    }
  ]
}
```

> Exactly **4 answers** required per question. Exactly **one** must have `"isCorrect": true`.

---

## Scoring Formula

```
speedRatio  = 1 − (responseTimeMs ÷ timeLimitMs)
speedBonus  = round(pointsBase × speedRatio)
totalScore  = pointsBase + speedBonus   (correct answer)
totalScore  = 0                          (wrong or no answer)

Default pointsBase = 500  →  max 1000 pts/question (instant correct)
                           →  min   1 pt  (correct at last moment)
```

Scoring is computed **server-side only**. Clients cannot manipulate their score.

---

## Accessibility

Answer tiles use **both colour AND shape** so colour-blind players can still play:

| Tile | Colour | Shape |
|---|---|---|
| A | 🔴 Red | ▲ Triangle |
| B | 🔵 Blue | ◆ Diamond |
| C | 🟠 Orange | ● Circle |
| D | 🟢 Green | ■ Square |

---

## Local Development

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Backend
```bash
cd trivia-app/backend
npm install
cp .env.example .env   # edit as needed
npm run dev            # starts on http://localhost:3001
```

### 2. Frontend
```bash
cd trivia-app/frontend
npm install
cp .env.example .env   # set VITE_SERVER_URL=http://localhost:3001
npm run dev            # starts on http://localhost:5173
```

### 3. Mobile (requires Expo Go or physical device)
```bash
cd trivia-app/mobile
npm install
npx expo start         # scan QR code with Expo Go on iPhone
```

---

## Environment Variables

### Backend
| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP server port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `ADMIN_SECRET` | `sabahlabs-admin-secret` | Admin panel password |
| `DATABASE_URL` | *(none)* | PostgreSQL connection string (set via Railway) |

### Frontend
| Variable | Default | Description |
|---|---|---|
| `VITE_SERVER_URL` | `http://localhost:3001` | Backend URL |
| `VITE_ADMIN_SECRET` | `sabnaya-admin-secret` | Must match backend `ADMIN_SECRET` |

### Mobile
| Variable | Default | Description |
|---|---|---|
| `EXPO_PUBLIC_SERVER_URL` | `http://localhost:3001` | Backend URL |

---

## Deployment

| Service | Platform | URL |
|---|---|---|
| Backend | Railway | `sabahlabs-backend-production.up.railway.app` |
| Database | Railway PostgreSQL | Auto-provisioned, connected via `DATABASE_URL` |
| Frontend | Vercel | `sabahlabs-frontend.vercel.app` |
| iOS App | Apple App Store | *In progress — `com.sabahlabs.app`* |

### Redeploy Backend
```bash
cd trivia-app/backend
railway up
```

### Redeploy Frontend
```bash
cd trivia-app/frontend
npm run build
vercel --prod
```

### Build iOS App
```bash
cd trivia-app/mobile
eas build --platform ios --profile production
```

---

## Known Limitations

| Limitation | Detail |
|---|---|
| **Mobile players see tiles only** | Question text and answer labels are not shown on the mobile app — host screen is the question display |
| **Mobile app not yet on App Store** | iOS app built with Expo — App Store submission in progress |
| **Image uploads are ephemeral** | Uploaded images are stored on the Railway server filesystem and reset on redeployment. Use an external URL for permanent images |
| **Single server game state** | All active game rooms live in Node.js memory. A server restart ends all active games |

---

## Repository

GitHub: [github.com/syedsabahhassan/sabnaya](https://github.com/syedsabahhassan/sabnaya)
