import { WebSocketServer, WebSocket } from "ws";
import {
  handleAnswer,
  handleCreateGame,
  handleDisconnect,
  handleJoinGame,
  handleRegister,
  handleStartGame,
} from "./commands.js";
const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws: WebSocket) => {
  console.log("Client connected");

  ws.on("message", (message: string) => {
    try {
      const parsed = JSON.parse(message.toString());
      const { type, data } = parsed;
      switch (type) {
        case "reg":
          handleRegister(ws, data);
          break;
        case "create_game":
          handleCreateGame(ws, data);
          break;
        case "join_game":
          handleJoinGame(ws, data);
          break;
        case "start_game":
          handleStartGame(ws, data);
          break;
        case "answer":
          handleAnswer(ws, data);
          break;
        default:
          console.log(`Unknown command: ${type}`);
      }
    } catch (error) {
      console.log("Invalid JSON received");
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    handleDisconnect(ws);
  });
});

console.log(`WebSocket server address: ws://localhost:${PORT}`);
