import { WebSocket } from "ws";
import { games, users } from "./state.js";
import type { Game, Question, PlayerResult, ScoreboardEntry } from "./types.js";
import { generateRoomCode } from "./utils.js";

export function sendResponse(ws: WebSocket, type: string, data: any) {
  if (ws.readyState === 1) {
    ws.send(
      JSON.stringify({
        type,
        data,
        id: 0,
      }),
    );
  }
}

export function handleRegister(ws: WebSocket, data: any) {
  const { name, password } = data;
  let user = users.get(name);

  if (user) {
    if (user.password !== password) {
      return sendResponse(ws, "reg", {
        name,
        index: "",
        error: true,
        errorText: "Wrong password",
      });
    }
    user.ws = ws;
  } else {
    const newUser = {
      name,
      password,
      index: Date.now().toString(),
      score: 0,
      ws: ws,
    };
    users.set(name, newUser);
    user = newUser;
  }

  sendResponse(ws, "reg", {
    name: user.name,
    index: user.index,
    error: false,
    errorText: "",
  });
}

export function handleCreateGame(
  ws: WebSocket,
  data: { questions: Question[] },
) {
  const host = Array.from(users.values()).find((u) => u.ws === ws);
  if (!host) return;

  const gameId = Date.now().toString();
  const roomCode = generateRoomCode();

  const newGame: Game = {
    id: gameId,
    code: roomCode,
    hostId: host.index,
    questions: data.questions,
    players: [],
    currentQuestion: -1,
    status: "waiting",
    playerAnswers: new Map(),
  };

  games.set(roomCode, newGame);

  sendResponse(ws, "game_created", {
    gameId: gameId,
    code: roomCode,
  });
}

function broadcastToGame(game: Game, type: string, data: any) {
  const msg = JSON.stringify({ type, data, id: 0 });

  game.players.forEach((player) => {
    if (player.ws?.readyState === 1) player.ws.send(msg);
  });

  const host = Array.from(users.values()).find((u) => u.index === game.hostId);
  if (host?.ws?.readyState === 1) {
    const isHostInPlayers = game.players.some((p) => p.index === host.index);
    if (!isHostInPlayers) host.ws.send(msg);
  }
}

export function handleJoinGame(ws: WebSocket, data: { code: string }) {
  const game = games.get(data.code);
  if (!game) return;

  const user = Array.from(users.values()).find((u) => u.ws === ws);
  if (!user) return;

  const alreadyIn = game.players.find((p) => p.index === user.index);
  if (!alreadyIn) {
    game.players.push({
      name: user.name,
      index: user.index,
      score: 0,
      ws: ws,
    });
  }

  sendResponse(ws, "game_joined", { gameId: game.id });

  broadcastToGame(game, "player_joined", {
    playerName: user.name,
    playerCount: game.players.length,
  });

  broadcastToGame(
    game,
    "update_players",
    game.players.map((p) => ({
      name: p.name,
      index: p.index,
      score: p.score,
    })),
  );
}

export function handleStartGame(ws: WebSocket, data: { gameId: string }) {
  const game = Array.from(games.values()).find((g) => g.id === data.gameId);
  const user = Array.from(users.values()).find((u) => u.ws === ws);

  if (!game || !user || user.index !== game.hostId) return;

  sendNextQuestion(game, 0);
}

function sendNextQuestion(game: Game, index: number) {
  const question = game.questions[index];
  if (!question) return;

  game.status = "in_progress";
  game.currentQuestion = index;
  game.questionStartTime = Date.now();
  game.playerAnswers.clear();

  broadcastToGame(game, "question", {
    questionNumber: index + 1,
    totalQuestions: game.questions.length,
    text: question.text,
    options: question.options,
    timeLimitSec: question.timeLimitSec,
  });

  game.questionTimer = setTimeout(() => {
    finishQuestion(game, index);
  }, question.timeLimitSec * 1000);
}

function finishQuestion(game: Game, qIndex: number) {
  if (game.currentQuestion !== qIndex) return;
  if (game.questionTimer) clearTimeout(game.questionTimer);

  const question = game.questions[qIndex];
  const playerResults: PlayerResult[] = game.players.map((player) => {
    const ans = game.playerAnswers.get(player.index);
    const isCorrect = ans ? ans.answerIndex === question.correctIndex : false;

    let pointsEarned = 0;
    if (isCorrect && ans) {
      const timeElapsed =
        (ans.timestamp - (game.questionStartTime || 0)) / 1000;
      const timeRemaining = Math.max(0, question.timeLimitSec - timeElapsed);
      pointsEarned = Math.round(1000 * (timeRemaining / question.timeLimitSec));
      player.score += pointsEarned;
    }

    return {
      name: player.name,
      answered: !!ans,
      correct: isCorrect,
      pointsEarned,
      totalScore: player.score,
    };
  });

  broadcastToGame(game, "question_result", {
    questionIndex: qIndex,
    correctIndex: question.correctIndex,
    playerResults,
  });

  setTimeout(() => {
    const nextIndex = qIndex + 1;
    if (nextIndex < game.questions.length) {
      sendNextQuestion(game, nextIndex);
    } else {
      sendFinalScoreboard(game);
    }
  }, 3000);
}

function sendFinalScoreboard(game: Game) {
  game.status = "finished";
  const scoreboard: ScoreboardEntry[] = [...game.players]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({
      name: p.name,
      score: p.score,
      rank: i + 1,
    }));

  broadcastToGame(game, "game_finished", { scoreboard });
}

export function handleAnswer(
  ws: WebSocket,
  data: { gameId: string; questionIndex: number; answerIndex: number },
) {
  const game = Array.from(games.values()).find((g) => g.id === data.gameId);
  const user = Array.from(users.values()).find((u) => u.ws === ws);

  if (
    !game ||
    !user ||
    game.status !== "in_progress" ||
    game.currentQuestion !== data.questionIndex
  )
    return;
  if (game.playerAnswers.has(user.index)) return;

  game.playerAnswers.set(user.index, {
    answerIndex: data.answerIndex,
    timestamp: Date.now(),
  });

  sendResponse(ws, "answer_accepted", { questionIndex: data.questionIndex });

  if (game.playerAnswers.size === game.players.length) {
    finishQuestion(game, game.currentQuestion);
  }
}

export function handleDisconnect(ws: WebSocket) {
  const user = Array.from(users.values()).find((u) => u.ws === ws);
  if (!user) return;
  delete user.ws;

  games.forEach((game) => {
    const initialCount = game.players.length;
    game.players = game.players.filter((p) => p.index !== user.index);

    if (game.players.length !== initialCount) {
      broadcastToGame(
        game,
        "update_players",
        game.players.map((p) => ({
          name: p.name,
          index: p.index,
          score: p.score,
        })),
      );

      if (
        game.status === "in_progress" &&
        game.playerAnswers.size === game.players.length
      ) {
        finishQuestion(game, game.currentQuestion);
      }
    }
  });
}
