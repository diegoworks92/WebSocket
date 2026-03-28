# WebSocket — Live Quiz Game Backend

This is the server-side implementation for a real-time Live Quiz Game, similar to Kahoot. It allows a host to create a quiz, players to join via a room code, and everyone to participate in a synchronized, fast-paced trivia challenge.

## Features

- Real-time Communication: Built with the ws library for low-latency updates.
- Dynamic Scoring: Points are calculated based on response speed using the formula:
  Points = 1000 \* (TimeRemaining / TimeLimit)
- Automated Game Flow: Server-side timers manage question transitions and result broadcasts.
- Robust Player Management: Handles player registrations, room joins, and graceful disconnects with real-time leaderboard updates.

## Technical Requirements

- Node.js: Version 24.x.x or higher.
- Language: TypeScript.
- Protocol: WebSocket (JSON-based communication).

## Installation & Running

1. Install dependencies:
   npm install

2. Start the server:
   npm run start

   The server will start at ws://localhost:8080 (or the address displayed in the terminal).

## Testing Example (JSON)

To test the game flow using a client like Postman, you can use the following structure to create a game:

{
"type": "create_game",
"data": {
"questions": [
{
"text": "What is the capital of France?",
"options": ["London", "Berlin", "Paris", "Madrid"],
"correctIndex": 2,
"timeLimitSec": 15
},
{
"text": "Which planet is known as the Red Planet?",
"options": ["Earth", "Mars", "Jupiter", "Saturn"],
"correctIndex": 1,
"timeLimitSec": 15
}
]
},
"id": 0
}

## Game Flow

1. Registration: Both host and players must register using the reg command.
2. Creation: The host creates a game with a list of questions, receiving a unique 6-character room code.
3. Joining: Players enter the room using the code.
4. Playing:
   - The host starts the game.
   - Players answer questions within the time limit.
   - After each question, the server broadcasts the correct answer and updated scores.
5. Conclusion: After the last question, a final scoreboard with ranks is sent to all participants.

## WebSocket Commands Summary

- reg (Client): Register or login a user.
- create_game (Host): Create a new game room.
- join_game (Player): Join a room via code.
- start_game (Host): Begin the first question.
- answer (Player): Submit an answer choice.
- question_result (Server): Broadcast correct answer and points.
- game_finished (Server): Final leaderboard and ranking.

## Project Structure

- src/server.ts: Entry point and WebSocket server setup.
- src/commands.ts: Core logic for handling all game actions and state transitions.
- src/state.ts: In-memory storage for active users and games.
- src/types.ts: TypeScript interfaces defining the game data structures.
