Assignment: WebSocket Live Quiz Game
What to do
Fork this repository
Implement the WebSocket server in the server/ folder
The client (React frontend) in client/ is already fully implemented and ready to use — do not modify it
Project structure
├── client/ # Frontend (React + Vite) — fully working, do not modify
├── server/ # Backend (Node.js + ws) — YOUR implementation goes here
│ ├── src/
│ │ ├── index.ts # Server entry point (starter code provided)
│ │ └── types.ts # TypeScript interfaces for all data structures
│ ├── package.json
│ └── tsconfig.json
└── package.json # Root workspace config
Getting started

# Install all dependencies (server + client)

npm install

# Run both server and client in dev mode

npm run dev

# Or run them separately:

npm run start:server # server only (ws://localhost:3000)
npm run start:client # client only (http://localhost:5173)
What is provided in server/
src/types.ts — all TypeScript interfaces you need: Player, Question, Game, User, WSMessage, and request data types (RegData, CreateGameData, JoinGameData, StartGameData, AnswerData)
src/index.ts — starter code that creates a WebSocketServer on port 3000. You need to implement all message handlers here
package.json — dependencies already configured (ws, dotenv, TypeScript tooling)
What you need to implement
Your server must handle all WebSocket commands described in the assignment specification. The client expects the following message protocol (all messages are JSON strings with { type, data, id: 0 } format):

Client → Server commands:

reg — register or login a player
create_game — host creates a game with questions
join_game — player joins a game by room code
start_game — host starts the game
answer — player submits an answer
Server → Client responses:

reg — registration result
game_created — game created with gameId and room code
game_joined — join confirmation
player_joined — broadcast when a player joins
update_players — broadcast updated player list
question — broadcast a question (without correct answer!)
answer_accepted — answer submission confirmed
question_result — broadcast results after a question ends
game_finished — broadcast final scoreboard
error — error message
Refer to the full assignment specification for detailed data structures and the expected game flow.

How to test
Start the server: npm run start:server
Start the client: npm run start:client
Open http://localhost:5173 in two browser tabs
In one tab — register and create a game (host)
In the other tab — register and join the game using the room code
Host starts the game, player answers questions
Verify scores, results, and final scoreboard
Build for production

# Build server

cd server && npm run build

# Start built server

npm run start
