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

  broadcastToGame(game, "question", {
    questionNumber: 1,
    totalQuestions: game.questions.length,
    text: firstQuestion.text,
    options: firstQuestion.options,
    timeLimitSec: firstQuestion.timeLimitSec,
  });

  console.log(`Game ${game.code} started by host ${user.name}`);
}
