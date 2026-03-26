import { WebSocket } from "ws";
import { users } from "./server.js";
import type { Player } from "./types.js";

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
