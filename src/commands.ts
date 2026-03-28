import { WebSocket } from "ws";
import { games, users } from "./state.js";
import type { Player, Game, Question } from "./types.js";
import { generateRoomCode } from "./utils.js";

export function sendResponse(ws: WebSocket, type: string, data: any) {
  ws.send(
    JSON.stringify({
      type,
      data,
      id: 0,
    }),
  );
}

export function handleRegister(ws: WebSocket, data: any) {
  const { name, password } = data;

  const existingUser = users.get(name);

  if (existingUser) {
    if (existingUser.password !== password) {
      return sendResponse(ws, "reg", {
        name,
        index: "",
        error: true,
        errorText: "Wrong password",
      });
    }

    existingUser.ws = ws;
  } else {
    const newUser = {
      name,
      password,
      index: Date.now().toString(),
      score: 0,
      ws: ws,
    };
    users.set(name, newUser);
  }

  const user = users.get(name)!;

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

  if (!host) {
    return console.error("Error: Host not found for this socket");
  }

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
    answers: new Map(),
  };

  games.set(roomCode, newGame);

  console.log(`Game created: ${roomCode} by host ${host.name}`);

  sendResponse(ws, "game_created", {
    gameId: gameId,
    code: roomCode,
  });
}

function broadcastToGame(game: Game, type: string, data: any) {
  game.players.forEach((player) => {
    if (player.ws && player.ws.readyState === 1) {
      sendResponse(player.ws, type, data);
    }
  });

  const host = Array.from(users.values()).find((u) => u.index === game.hostId);
  if (host && host.ws && host.ws.readyState === 1) {
    const isHostInPlayers = game.players.some((p) => p.index === host.index);
    if (!isHostInPlayers) {
      sendResponse(host.ws, type, data);
    }
  }
}
export function handleJoinGame(ws: WebSocket, data: { code: string }) {
  const { code } = data;
  const game = games.get(code);

  if (!game) {
    return console.error(`Game not found with code: ${code}`);
  }

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

  const playersList = game.players.map((p) => ({
    name: p.name,
    index: p.index,
    score: p.score,
  }));
  broadcastToGame(game, "update_players", playersList);
}

export function handleStartGame(ws: WebSocket, data: { gameId: string }) {
  const { gameId } = data;
  const game = Array.from(games.values()).find((g) => g.id === gameId);

  if (!game) {
    return console.error("Game not found");
  }

  const user = Array.from(users.values()).find((u) => u.ws === ws);
  if (!user || user.index !== game.hostId) {
    return console.error("Only the host can start the game");
  }

  const firstQuestion = game.questions[0];
  if (!firstQuestion) {
    return console.error("Game has no questions");
  }

  game.status = "in_progress";
  game.currentQuestion = 0;
  game.questionStartTime = Date.now();

  setTimeout(() => {
    finishQuestion(game, 0);
  }, firstQuestion.timeLimitSec * 1000);

  console.log(
    `Game ${game.code} started. Timer set for ${firstQuestion.timeLimitSec}s`,
  );
}

function finishQuestion(game: Game, qIndex: number) {
  if (game.currentQuestion !== qIndex) return;

  const question = game.questions[qIndex];

  if (!question) return;

  const playerResults = game.players.map((player) => {
    const res = game.answers.get(player.index.toString());
    return {
      name: player.name,
      answered: !!res,
      correct: res ? res.answerIndex === question.correctIndex : false,
      pointsEarned: res ? res.points : 0,
      totalScore: player.score,
    };
  });

  broadcastToGame(game, "question_result", {
    questionIndex: qIndex,
    correctIndex: question.correctIndex,
    playerResults,
  });

  game.answers.clear();
}

export function handleAnswer(
  ws: WebSocket,
  data: { gameId: string; questionIndex: number; answerIndex: number },
) {
  const { gameId, questionIndex, answerIndex } = data;

  const game = Array.from(games.values()).find(
    (g) => g.id === gameId || g.code === gameId,
  );
  const user = Array.from(users.values()).find((u) => u.ws === ws);

  if (!game)
    return console.error(`Answer Error: Game not found with ID ${gameId}`);
  if (!user) return console.error("Answer Error: User not found");
  if (game.status !== "in_progress")
    return console.error("Answer Error: Game not in progress");

  const player = game.players.find((p) => p.index === user.index);
  if (!player) return console.error("Answer Error: Player not in game");
  if (game.currentQuestion !== questionIndex)
    return console.error("Answer Error: Wrong question index");

  const question = game.questions[questionIndex];
  if (!question || !game.questionStartTime) return;

  const now = Date.now();
  const timeElapsed = (now - game.questionStartTime) / 1000;
  const timeLimit = question.timeLimitSec;

  let pointsEarned = 0;

  if (timeElapsed <= timeLimit && answerIndex === question.correctIndex) {
    const timeRemaining = Math.max(0, timeLimit - timeElapsed);
    pointsEarned = Math.round(1000 * (timeRemaining / timeLimit));
    player.score += pointsEarned;
  }

  game.answers.set(user.index.toString(), {
    answerIndex,
    points: pointsEarned,
  });

  sendResponse(ws, "answer_accepted", { questionIndex });
}
