import type { Player, Game } from "./types.js";

export const users = new Map<string, Player & { password: string }>();
export const games = new Map<string, Game>();
