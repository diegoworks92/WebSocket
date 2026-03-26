import { WebSocket } from "ws";

export interface Player {
  name: string;
  index: string | number;
  score: number;
  ws?: WebSocket;
}

export interface Question {
  text: string;
  options: string[];
  correctIndex: number;
  timeLimitSec: number;
}

export interface Game {
  id: string;
  code: string;
  hostId: string | number;
  questions: Question[];
  players: Player[];
  currentQuestion: number;
  status: "waiting" | "in_progress" | "finished";
}
