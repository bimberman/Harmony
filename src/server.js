import { WebSocketServer } from "ws";
import http from "http";
import fs from "fs";

const PORT = process.env.PORT || 8080;

// Create HTTP server for Fly.io WebSocket support
const httpServer = http.createServer();
const wss = new WebSocketServer({ server: httpServer });

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});

// Store rooms and their states
const rooms = new Map();
const clientRooms = new Map();
const countdownIntervals = new Map(); // Store countdown intervals for each room

// Load colors from JSON file
const colors = JSON.parse(fs.readFileSync("./src/colors.json", "utf-8"));

const createRoom = () => {
  const roomId = Math.random().toString(36).substring(2, 8);
  rooms.set(roomId, {
    id: roomId,
    phase: "lobby", // Set initial phase to "lobby"
    players: [],
    currentPrompt: null,
    targetColor: null,
    roundNumber: 0,
    scores: {},
    guesses: {},
    maxRounds: 5,
    host: null,
    colorList: [], // Add colorList to room state
  });
  return roomId;
};

const getRandomColors = (numColors = 5) => {
  const shuffled = colors.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numColors);
};

const broadcastToRoom = (roomId, message) => {
  const room = rooms.get(roomId);
  if (!room) return;

  wss.clients.forEach((client) => {
    const clientId = Array.from(clientRooms.entries()).find(
      ([_, rid]) => rid === roomId
    )?.[0];
    if (clientId && client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
};

const exitRoom = (clientId) => {
  const roomId = clientRooms.get(clientId);
  if (roomId) {
    const room = rooms.get(roomId);
    if (room) {
      room.players = room.players.filter((p) => p.id !== clientId);
      if (room.players.length === 0) {
        rooms.delete(roomId);
      } else {
        broadcastToRoom(roomId, {
          type: "GAME_STATE_UPDATE",
          payload: room,
        });
      }
    }
    clientRooms.delete(clientId);
  }
};

wss.on("connection", (socket) => {
  const clientId = Date.now().toString();
  socket.id = clientId; // Assign the clientId to the socket

  socket.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`Received from ${clientId}:`, data);

      switch (data.type) {
        case "CREATE_ROOM": {
          const roomId = createRoom();
          clientRooms.set(clientId, roomId);
          const room = rooms.get(roomId);
          room.host = data.payload.nickname;
          room.players.push({
            id: clientId,
            nickname: data.payload.nickname,
            isHost: true,
          });
          room.phase = "lobby"; // Explicitly set the phase to "lobby"
          room.colorList = getRandomColors(); // Generate and store the color list

          socket.send(
            JSON.stringify({
              type: "ROOM_CREATED",
              payload: { roomId, gameState: room },
            })
          );
          break;
        }

        case "JOIN_ROOM": {
          const { roomId, nickname } = data.payload;
          const room = rooms.get(roomId);

          if (!room) {
            socket.send(
              JSON.stringify({
                type: "ERROR",
                payload: "Room not found",
              })
            );
            return;
          }

          clientRooms.set(clientId, roomId);
          room.players.push({
            id: clientId,
            nickname,
            isHost: false,
          });

          // Broadcast updated room state
          broadcastToRoom(roomId, {
            type: "GAME_STATE_UPDATE",
            payload: room,
          });
          break;
        }

        case "START_GAME": {
          const roomId = clientRooms.get(clientId);
          const room = rooms.get(roomId);

          if (room && room.host === data.payload.nickname) {
            room.phase = "play"; // Set phase to play
            room.roundNumber = 1;
            room.targetColor = `rgb(${room.colorList[0].rgb.r}, ${room.colorList[0].rgb.g}, ${room.colorList[0].rgb.b})`; // Use the first color from the list
            room.scores = {};
            room.players.forEach((player) => {
              room.scores[player.nickname] = 0;
            });

            broadcastToRoom(roomId, {
              type: "GAME_STATE_UPDATE",
              payload: room, // Broadcast updated room state
            });
          }
          break;
        }

        case "SUBMIT_GUESS": {
          const roomId = clientRooms.get(clientId);
          const room = rooms.get(roomId);

          if (room && room.phase === "play") {
            const { nickname, guess } = data.payload;
            room.guesses[nickname] = guess;

            // Broadcast updated room state after a guess is submitted
            broadcastToRoom(roomId, {
              type: "GAME_STATE_UPDATE",
              payload: room,
            });

            if (Object.keys(room.guesses).length === room.players.length) {
              if (!countdownIntervals.has(roomId)) {
                let countdown = 5;
                const countdownInterval = setInterval(() => {
                  broadcastToRoom(roomId, {
                    type: "ROUND_END_COUNTDOWN",
                    payload: countdown, // Correctly structure the countdown payload
                  });
                  countdown--;
                  if (countdown < 0) {
                    clearInterval(countdownInterval);
                    countdownIntervals.delete(roomId);
                    endRound(roomId);
                  }
                }, 1000); // Broadcast countdown every second
                countdownIntervals.set(roomId, countdownInterval);
              }
            }
          }
          break;
        }

        case "END_ROUND": {
          const roomId = clientRooms.get(clientId);
          endRound(roomId);
          break;
        }

        case "CLOSE_LOBBY": {
          const roomId = clientRooms.get(clientId);
          const room = rooms.get(roomId);

          if (room && room.host === data.payload.nickname) {
            room.players.forEach((player) => {
              const clientSocket = Array.from(wss.clients).find(
                (client) => client.id === player.id
              );
              if (
                clientSocket &&
                clientSocket.readyState === clientSocket.OPEN
              ) {
                clientSocket.send(
                  JSON.stringify({
                    type: "ALERT",
                    payload: "The lobby has been closed by the host.",
                  })
                );
              }
              clientRooms.delete(player.id);
            });
            rooms.delete(roomId);
          }
          break;
        }

        case "EXIT_LOBBY": {
          exitRoom(clientId);
          break;
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  socket.on("close", () => {
    exitRoom(clientId);
  });
});

const calculateScore = (guess, target) => {
  const diff = Math.sqrt(
    Math.pow(guess.r - target.r, 2) +
      Math.pow(guess.g - target.g, 2) +
      Math.pow(guess.b - target.b, 2)
  );
  const maxDiff = Math.sqrt(Math.pow(255, 2) * 3);
  return Math.max(0, 100 - (diff / maxDiff) * 100);
};

const endRound = (roomId) => {
  const room = rooms.get(roomId);
  if (room) {
    const targetColor = room.colorList[room.roundNumber - 1].rgb;
    Object.keys(room.guesses).forEach((player) => {
      const guess = room.guesses[player];
      const score = calculateScore(guess, targetColor);
      room.scores[player] = (room.scores[player] || 0) + Math.round(score);
    });

    room.guesses = {};
    room.roundNumber++;
    if (room.roundNumber > room.maxRounds) {
      room.phase = "end";
    } else {
      const nextColor = room.colorList[room.roundNumber - 1].rgb;
      room.targetColor = `rgb(${nextColor.r}, ${nextColor.g}, ${nextColor.b})`; // Use the next color from the list
    }

    broadcastToRoom(roomId, {
      type: "GAME_STATE_UPDATE",
      payload: room,
    });
  }
};

console.log(`WebSocket server running on port ${PORT}`);
