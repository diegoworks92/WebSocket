import { WebSocket } from "ws";

export interface Player {
  name: string;
  index: string;
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
  hostId: string;
  questions: Question[];
  players: Player[];
  currentQuestion: number;
  status: "waiting" | "in_progress" | "finished";
  questionStartTime?: number;
  questionTimer?: NodeJS.Timeout;
  playerAnswers: Map<string, { answerIndex: number; timestamp: number }>;
}

export interface PlayerResult {
  name: string;
  answered: boolean;
  correct: boolean;
  pointsEarned: number;
  totalScore: number;
}

export interface ScoreboardEntry {
  name: string;
  score: number;
  rank: number;
}
