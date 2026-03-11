import React, { useEffect, useReducer, useCallback } from 'react';
import socket from './socket';
import LandingPage from './components/LandingPage';
import HostView from './components/HostView';
import PlayerView from './components/PlayerView';
import AdminPanel from './components/AdminPanel/index';

// ─────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────
const initialState = {
  screen: 'landing',       // landing | host | player | admin
  error: null,
  isConnected: false,
  roomCode: null,
  gamePhase: 'idle',       // idle | lobby | question | reveal | leaderboard | finished

  hostData: {
    quizTitle: null,
    quizId: null,
    questionCount: 0,
    players: [],
    teams: [],
    isTeamMode: false,
    currentQuestion: null,
    timeRemaining: 0,
    answeredCount: 0,
    totalPlayers: 0,
    roundResult: null,
    leaderboard: [],
    teamLeaderboard: null,
    finalLeaderboard: [],
  },

  playerData: {
    playerName: null,
    teamName: null,
    currentScore: 0,
    currentStreak: 0,
    questionData: null,
    timeRemaining: 0,
    myAnswer: null,
    answerLocked: false,
    roundResult: null,
    leaderboard: [],
    finalLeaderboard: [],
  },
};

// ─────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_CONNECTED':  return { ...state, isConnected: action.payload };
    case 'SET_ERROR':      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':    return { ...state, error: null };
    case 'GO_HOST':        return { ...state, screen: 'host', error: null };
    case 'GO_PLAYER':      return { ...state, screen: 'player', error: null };
    case 'GO_ADMIN':       return { ...state, screen: 'admin', error: null };
    case 'RESET':          return { ...initialState, isConnected: state.isConnected };

    // ── HOST ─────────────────────────────────────────────────
    case 'HOST_ROOM_CREATED':
      return {
        ...state, roomCode: action.payload.roomCode, gamePhase: 'lobby',
        hostData: {
          ...state.hostData,
          quizTitle: action.payload.quizTitle,
          quizId: action.payload.quizId,
          questionCount: action.payload.questionCount,
          isTeamMode: action.payload.isTeamMode,
          teams: action.payload.teamList || [],
          players: [],
        },
      };

    case 'HOST_PLAYER_JOINED':
      return {
        ...state,
        hostData: {
          ...state.hostData,
          players: action.payload.playerList,
          teams: action.payload.teamList || state.hostData.teams,
        },
      };

    case 'HOST_PLAYER_LEFT':
      return {
        ...state,
        hostData: {
          ...state.hostData,
          players: action.payload.playerList,
          teams: action.payload.teamList || state.hostData.teams,
        },
      };

    case 'HOST_GAME_STARTED':
      return { ...state, gamePhase: 'question' };

    case 'HOST_QUESTION_STARTED':
      return {
        ...state, gamePhase: 'question',
        hostData: {
          ...state.hostData,
          currentQuestion: {
            questionIndex:    action.payload.questionIndex,
            totalQuestions:   action.payload.totalQuestions,
            questionText:     action.payload.questionText,
            imageUrl:         action.payload.imageUrl || null,
            answers:          action.payload.answers,
            correctAnswerIndex: action.payload.correctAnswerIndex,
            timeLimit:        action.payload.timeLimit,
            pointsBase:       action.payload.pointsBase,
          },
          timeRemaining: action.payload.timeLimit,
          answeredCount: 0,
          totalPlayers:  action.payload.totalPlayers,
          roundResult:   null,
        },
      };

    case 'HOST_TIMER_TICK':
      return { ...state, hostData: { ...state.hostData, timeRemaining: action.payload.timeRemaining } };

    case 'HOST_ANSWER_COUNT':
      return {
        ...state,
        hostData: { ...state.hostData, answeredCount: action.payload.answeredCount, totalPlayers: action.payload.totalPlayers },
      };

    case 'HOST_QUESTION_ENDED':
      return {
        ...state, gamePhase: 'reveal',
        hostData: { ...state.hostData, roundResult: action.payload },
      };

    case 'HOST_LEADERBOARD':
      return {
        ...state,
        hostData: { ...state.hostData, leaderboard: action.payload.leaderboard, teamLeaderboard: action.payload.teamLeaderboard || null },
      };

    case 'HOST_GAME_FINISHED':
      return {
        ...state, gamePhase: 'finished',
        hostData: { ...state.hostData, finalLeaderboard: action.payload.leaderboard },
      };

    // ── PLAYER ───────────────────────────────────────────────
    case 'PLAYER_JOIN_SUCCESS':
      return {
        ...state,
        roomCode: action.payload.roomCode,
        gamePhase: 'lobby',
        playerData: { ...state.playerData, playerName: action.payload.playerName, teamName: action.payload.teamName || null },
      };

    case 'PLAYER_GAME_STARTED':
      return { ...state, gamePhase: 'question' };

    case 'PLAYER_QUESTION_STARTED':
      return {
        ...state, gamePhase: 'question',
        playerData: {
          ...state.playerData,
          questionData: action.payload,
          timeRemaining: action.payload.timeLimit,
          myAnswer: null, answerLocked: false, roundResult: null,
        },
      };

    case 'PLAYER_TIMER_TICK':
      return { ...state, playerData: { ...state.playerData, timeRemaining: action.payload.timeRemaining } };

    case 'PLAYER_ANSWER_RECEIVED':
      return { ...state, playerData: { ...state.playerData, myAnswer: action.payload.answerIndex, answerLocked: true } };

    case 'PLAYER_ANSWER_LOCKED':
      return { ...state, playerData: { ...state.playerData, answerLocked: true } };

    case 'PLAYER_QUESTION_RESULT':
      return {
        ...state, gamePhase: 'reveal',
        playerData: {
          ...state.playerData,
          roundResult: action.payload,
          currentScore: action.payload.totalScore,
          currentStreak: action.payload.newStreak || 0,
          answerLocked: true,
        },
      };

    case 'PLAYER_LEADERBOARD':
      return { ...state, playerData: { ...state.playerData, leaderboard: action.payload.leaderboard } };

    case 'PLAYER_GAME_FINISHED':
      return {
        ...state, gamePhase: 'finished',
        playerData: { ...state.playerData, finalLeaderboard: action.payload.leaderboard },
      };

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    socket.connect();

    socket.on('connect',    () => dispatch({ type: 'SET_CONNECTED', payload: true }));
    socket.on('disconnect', () => dispatch({ type: 'SET_CONNECTED', payload: false }));

    // Host events
    socket.on('room_created',         (d) => dispatch({ type: 'HOST_ROOM_CREATED', payload: d }));
    socket.on('player_joined',        (d) => dispatch({ type: 'HOST_PLAYER_JOINED', payload: d }));
    socket.on('player_left',          (d) => dispatch({ type: 'HOST_PLAYER_LEFT', payload: d }));
    socket.on('game_started',         ()  => dispatch({ type: 'HOST_GAME_STARTED' }));
    socket.on('answer_count_updated', (d) => dispatch({ type: 'HOST_ANSWER_COUNT', payload: d }));
    socket.on('host_question_ended',  (d) => dispatch({ type: 'HOST_QUESTION_ENDED', payload: d }));

    // Player events
    socket.on('join_success',             (d) => dispatch({ type: 'PLAYER_JOIN_SUCCESS', payload: d }));
    socket.on('join_error',               (d) => dispatch({ type: 'SET_ERROR', payload: d.message }));
    socket.on('answer_received',          (d) => dispatch({ type: 'PLAYER_ANSWER_RECEIVED', payload: d }));
    socket.on('answer_locked',            ()  => dispatch({ type: 'PLAYER_ANSWER_LOCKED' }));
    socket.on('player_question_result',   (d) => dispatch({ type: 'PLAYER_QUESTION_RESULT', payload: d }));

    // Shared
    socket.on('question_started', (d) => {
      if (d.isHost) dispatch({ type: 'HOST_QUESTION_STARTED', payload: d });
      else          dispatch({ type: 'PLAYER_QUESTION_STARTED', payload: d });
    });

    socket.on('timer_tick', (d) => {
      dispatch({ type: 'HOST_TIMER_TICK', payload: d });
      dispatch({ type: 'PLAYER_TIMER_TICK', payload: d });
    });

    socket.on('leaderboard_updated', (d) => {
      dispatch({ type: 'HOST_LEADERBOARD', payload: d });
      dispatch({ type: 'PLAYER_LEADERBOARD', payload: d });
    });

    socket.on('game_finished', (d) => {
      dispatch({ type: 'HOST_GAME_FINISHED', payload: d });
      dispatch({ type: 'PLAYER_GAME_FINISHED', payload: d });
    });

    socket.on('host_disconnected', () =>
      dispatch({ type: 'SET_ERROR', payload: 'The host disconnected. Game over.' })
    );
    socket.on('error', (d) => dispatch({ type: 'SET_ERROR', payload: d.message }));

    return () => socket.removeAllListeners();
  }, []);

  // Actions
  const actions = {
    goHost:    () => dispatch({ type: 'GO_HOST' }),
    goPlayer:  () => dispatch({ type: 'GO_PLAYER' }),
    goAdmin:   () => dispatch({ type: 'GO_ADMIN' }),
    reset:     () => dispatch({ type: 'RESET' }),
    clearError:() => dispatch({ type: 'CLEAR_ERROR' }),

    createRoom: useCallback((quizId, isTeamMode = false) => {
      socket.emit('create_room', { quizId, isTeamMode });
    }, []),

    joinRoom: useCallback((roomCode, playerName, teamName) => {
      dispatch({ type: 'CLEAR_ERROR' });
      socket.emit('join_room', { roomCode, playerName, teamName });
    }, []),

    startGame:    useCallback(() => socket.emit('start_game'), []),
    submitAnswer: useCallback((i) => socket.emit('submit_answer', { answerIndex: i }), []),
    nextQuestion: useCallback(() => socket.emit('next_question'), []),
    endGame:      useCallback(() => socket.emit('end_game'), []),
  };

  return (
    <div className="app">
      {state.screen === 'landing' && (
        <LandingPage
          onHostClick={actions.goHost}
          onPlayerClick={actions.goPlayer}
          onAdminClick={actions.goAdmin}
          isConnected={state.isConnected}
        />
      )}
      {state.screen === 'host' && (
        <HostView state={state} actions={actions} />
      )}
      {state.screen === 'player' && (
        <PlayerView state={state} actions={actions} />
      )}
      {state.screen === 'admin' && (
        <AdminPanel onBack={actions.reset} />
      )}

      {state.error && (
        <div className="error-toast" onClick={actions.clearError}>
          <span>⚠️ {state.error}</span>
          <button className="error-close">✕</button>
        </div>
      )}
    </div>
  );
}
