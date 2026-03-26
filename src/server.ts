import { WebSocketServer, WebSocket } from "ws";
import type { Player, Game } from "./types.js";
import { handleRegister } from "./commands.js";

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

export const users = new Map<string, Player & { password: string }>();
export const games = new Map<string, Game>();

wss.on("connection", (ws: WebSocket) => {
  console.log("Client connected");

  ws.on("message", (message: string) => {
    try {
      /* const parsedMessage = JSON.parse(message.toString());
      console.log("Received:", parsedMessage); */
      const parsed = JSON.parse(message.toString());
      const { type, data } = parsed;
      switch (type) {
        case "reg":
          handleRegister(ws, data);
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
  });
});

console.log(`WebSocket server address: ws://localhost:${PORT}`);
