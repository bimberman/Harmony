import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Crown, Users, Copy, Timer, CheckCircle, Circle } from "lucide-react"; // Add this import
import { Progress } from "@/components/ui/progress";

const INITIAL_TIMER = 40;

const ColorHarmony = () => {
  const [gameState, setGameState] = useState({
    phase: "setup",
    players: [],
    currentPrompt: null,
    targetColor: null,
    roundNumber: 0,
    scores: {},
    guesses: {},
    maxRounds: 5,
  });

  const [colorGuess, setColorGuess] = useState({ r: "", g: "", b: "" });
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIMER);
  const [nickname, setNickname] = useState("");
  const [roomId, setRoomId] = useState("");
  const [ws, setWs] = useState(null);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasExitedLobby, setHasExitedLobby] = useState(false);
  const [roundEndCountdown, setRoundEndCountdown] = useState(null);

  useEffect(() => {
    const socket = new WebSocket("wss://harmony.benimberman.com");
    
    socket.onopen = () => {
      console.log("Connected to WebSocket server");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received from server:", data);

      switch (data.type) {
        case "ROOM_CREATED":
          setRoomId(data.payload.roomId);
          setGameState(data.payload.gameState);
          setIsHost(true);
          setIsLoading(false);
          break;

        case "GAME_STATE_UPDATE":
          setGameState(data.payload);
          setIsLoading(false);
          break;

        case "ROUND_END_COUNTDOWN":
          setRoundEndCountdown(data.payload);
          break;

        case "ERROR":
          alert(data.payload);
          setIsLoading(false);
          break;

        case "ALERT":
          alert(data.payload);
          setRoomId("");
          setGameState({
            phase: "setup",
            players: [],
            currentPrompt: null,
            targetColor: null,
            roundNumber: 0,
            scores: {},
            guesses: {},
            maxRounds: 5,
          });
          setIsHost(false);
          setShowJoinInput(false);
          break;
      }
    };

    socket.onclose = () => {
      console.log("Disconnected from WebSocket server");
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [nickname]);

  useEffect(() => {
    let interval;
    if (gameState.phase === "input" && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState.phase === "input") {
      submitGuess();
    }
    return () => clearInterval(interval);
  }, [timeLeft, gameState.phase]);

  useEffect(() => {
    if (gameState.phase === "play") {
      setTimeLeft(INITIAL_TIMER); // Reset the timer when the game phase is "play"
    }
  }, [gameState.phase]);

  useEffect(() => {
    let interval;
    if (roundEndCountdown !== null) {
      interval = setInterval(() => {
        setRoundEndCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [roundEndCountdown]);

  useEffect(() => {
    if (roundEndCountdown === 0) {
      // End the round
      setRoundEndCountdown(null);
      // Proceed to the next round or end the game
      // Remove the following line to prevent multiple executions
      // ws.send(
      //   JSON.stringify({
      //     type: "END_ROUND",
      //     payload: { roomId },
      //   })
      // );
    }
  }, [roundEndCountdown, roomId, ws]);

  const createGame = () => {
    if (!nickname) {
      alert("Please enter a nickname to create a game.");
      return;
    }
    ws.send(
      JSON.stringify({
        type: "CREATE_ROOM",
        payload: { nickname },
      })
    );
    setIsLoading(true);
  };

  const startGame = () => {
    ws.send(
      JSON.stringify({
        type: "START_GAME",
        payload: { nickname },
      })
    );
    setGameState((prev) => ({ ...prev, phase: "input" })); // Set phase to "input" when the game starts
  };

  const joinGame = () => {
    if (!nickname || !roomId) {
      alert("Please enter both nickname and room ID");
      return;
    }
    ws.send(
      JSON.stringify({
        type: "JOIN_ROOM",
        payload: { roomId, nickname },
      })
    );
    setIsLoading(true);
  };

  const exitLobby = () => {
    ws.send(
      JSON.stringify({
        type: "EXIT_LOBBY",
        payload: { roomId, nickname },
      })
    );
    setRoomId("");
    setGameState({
      phase: "setup",
      players: [],
      currentPrompt: null,
      targetColor: null,
      roundNumber: 0,
      scores: {},
      guesses: {},
      maxRounds: 5,
    });
    setIsHost(false);
    setShowJoinInput(false);
    setHasExitedLobby(true); // Set the state to true when exiting the lobby
  };

  const closeLobby = () => {
    ws.send(
      JSON.stringify({
        type: "CLOSE_LOBBY",
        payload: { roomId, nickname },
      })
    );
    setRoomId("");
    setGameState({
      phase: "setup",
      players: [],
      currentPrompt: null,
      targetColor: null,
      roundNumber: 0,
      scores: {},
      guesses: {},
      maxRounds: 5,
    });
    setIsHost(false);
    setShowJoinInput(false);
  };

  const submitGuess = () => {
    const { r, g, b } = colorGuess;
    if (r === "" || g === "" || b === "") return;

    if (ws && ws.readyState === WebSocket.OPEN) {
      // Ensure WebSocket is open
      ws.send(
        JSON.stringify({
          type: "SUBMIT_GUESS",
          payload: {
            nickname,
            guess: { r, g, b },
          },
        })
      );
    }

    setGameState((prev) => ({
      ...prev,
      guesses: {
        ...prev.guesses,
        [nickname]: { r, g, b },
      },
    }));

    if (
      Object.keys(gameState.guesses).length + 1 ===
      gameState.players.length
    ) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Ensure WebSocket is open
        ws.send(
          JSON.stringify({
            type: "START_ROUND_END_COUNTDOWN",
            payload: { roomId },
          })
        );
      }
    }
  };

  const handleColorInput = (component, value) => {
    setColorGuess((prev) => ({
      ...prev,
      [component]: Math.max(0, Math.min(255, Number(value) || 0)),
    }));
  };

  const renderLobby = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Lobby</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            {gameState.players.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">#{index + 1}</span>
                  {gameState.guesses[player.nickname] && (
                    <CheckCircle className="text-green-500" size={16} />
                  )}
                  <span className="font-medium">{player.nickname}</span>
                  {player.isHost && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Host
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isHost ? (
            <>
              <Button
                onClick={startGame}
                className="w-full"
                disabled={gameState.players.length < 2}
              >
                {gameState.players.length < 2
                  ? "Waiting for more players..."
                  : "Start Game"}
              </Button>
              <Button onClick={closeLobby} className="w-full mt-2">
                Close Lobby
              </Button>
            </>
          ) : (
            <Button onClick={exitLobby} className="w-full">
              Exit Lobby
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const renderLeaderboard = () => (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="text-xl font-bold mb-2">Leaderboard</h3>
      <ul className="space-y-1">
        {Object.entries(gameState.scores)
          .sort(([, a], [, b]) => b - a)
          .map(([player, score], index) => (
            <li
              key={player}
              className="flex justify-between p-2 bg-white rounded-lg shadow-sm"
            >
              <div className="flex items-center gap-2">
                {gameState.guesses[player] ? (
                  <CheckCircle className="text-green-500" size={16} />
                ) : (
                  <Circle className="text-gray-500" size={16} />
                )}
                <span>
                  {index + 1}. {player}
                </span>
              </div>
              <span>{Math.round(score)} pts</span>{" "}
              {/* Round the score for display */}
            </li>
          ))}
      </ul>
    </div>
  );

  const returnToMainMenu = () => {
    setRoomId("");
    setGameState({
      phase: "setup",
      players: [],
      currentPrompt: null,
      targetColor: null,
      roundNumber: 0,
      scores: {},
      guesses: {},
      maxRounds: 5,
    });
    setIsHost(false);
    setShowJoinInput(false);
    setHasExitedLobby(false);
  };

  const renderEndGameLeaderboard = () => {
    const sortedScores = Object.entries(gameState.scores).sort(
      ([, a], [, b]) => b - a
    );
    const highestScore = sortedScores[0][1];
    const winners = sortedScores
      .filter(([, score]) => score === highestScore)
      .map(([player]) => player);

    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <h2 className="text-3xl font-bold mb-4">Game Over</h2>
        <h3 className="text-2xl font-bold mb-2">Leaderboard</h3>
        <ul className="space-y-2">
          {sortedScores.map(([player, score], index) => (
            <li
              key={player}
              className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm"
            >
              <div className="flex items-center gap-2">
                {winners.includes(player) && (
                  <Crown className="text-yellow-500" size={24} />
                )}
                <span className="text-xl font-medium">{player}</span>
              </div>
              <span className="text-xl">{Math.round(score)} pts</span>{" "}
              {/* Round the score for display */}
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <h4 className="text-xl font-bold">
            Winner{winners.length > 1 ? "s" : ""}:
          </h4>
          <p className="text-lg">{winners.join(" / ")}</p>
        </div>
        <Button onClick={returnToMainMenu} className="mt-6">
          Return to Main Menu
        </Button>
      </div>
    );
  };

  const renderGame = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            Round {gameState.roundNumber} / {gameState.maxRounds}
          </h2>
          {roundEndCountdown !== null && (
            <span className="text-sm text-red-600">
              Round ends in {roundEndCountdown}s. Last change to update your
              guess!
            </span>
          )}
          <span className="text-sm text-gray-600">
            Players: {gameState.players.length}
          </span>
        </div>
        {gameState.currentPrompt && (
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-2 text-left">
              {gameState.currentPrompt.name}
            </h3>
            <p className="text-gray-600 text-left">
              {gameState.currentPrompt.description}
            </p>
          </div>
        )}
        <div className="mb-6">
          <Progress value={(timeLeft / INITIAL_TIMER) * 100} />{" "}
          {/* Ensure the progress value is correctly calculated */}
        </div>
        {gameState.colorList &&
          gameState.colorList[gameState.roundNumber - 1] && (
            <div className="mb-6 text-left">
              <h3 className="text-xl font-bold">
                {gameState.colorList[gameState.roundNumber - 1].name}
              </h3>
              <p className="text-gray-600">
                {gameState.colorList[gameState.roundNumber - 1].description}
              </p>
            </div>
          )}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {["r", "g", "b"].map((color) => (
            <div key={color}>
              <label className="block text-sm font-medium mb-1">
                {color.toUpperCase()} (0-255)
              </label>
              <Input
                type="number"
                value={colorGuess[color] || ""}
                onChange={(e) => handleColorInput(color, e.target.value)}
                className="w-full"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-6 mb-6">
          <div className="text-center">
            <div
              className="w-24 h-24 rounded-lg border shadow-sm mb-2"
              style={{
                backgroundColor: `rgb(${colorGuess.r || 0}, ${
                  colorGuess.g || 0
                }, ${colorGuess.b || 0})`,
              }}
            />
            <p className="text-sm text-gray-600">Your Guess</p>
          </div>
          {gameState.targetColor && (
            <div className="text-center">
              <div
                className="w-24 h-24 rounded-lg shadow-sm mb-2"
                style={{ backgroundColor: gameState.targetColor }}
              />
              <p className="text-sm text-gray-600">Target Color</p>
            </div>
          )}
        </div>
        <div className="flex justify-center">
          <Button onClick={submitGuess} className="px-6">
            {gameState.guesses[nickname] ? "Update Guess" : "Submit Guess"}
          </Button>
        </div>
      </div>
      {renderLeaderboard()}
    </div>
  );

  useEffect(() => {
    if (hasExitedLobby) {
      setHasExitedLobby(false); // Reset the state
      setIsLoading(false); // Ensure loading state is reset
    }
  }, [hasExitedLobby]);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <span className="text-gray-500">Loading...</span>
        </div>
      ) : hasExitedLobby ? (
        <div className="flex justify-center items-center h-full">
          <span className="text-gray-500">You have exited the lobby.</span>
        </div>
      ) : gameState.phase === "end" ? (
        renderEndGameLeaderboard()
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>Color Harmony</CardTitle>
              {roomId && (
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-md">
                  <span className="text-sm">Room: {roomId}</span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {gameState.phase === "setup" && (
              <div className="space-y-4">
                <Input
                  placeholder="Enter your nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />

                {!showJoinInput ? (
                  <div className="flex gap-2">
                    <Button onClick={createGame}>Create New Game</Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowJoinInput(true)}
                    >
                      Join Existing Game
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter room ID"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                    />
                    <Button onClick={joinGame}>Join Game</Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowJoinInput(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}

            {gameState.phase === "lobby" && renderLobby()}

            {gameState.phase === "play" && renderGame()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ColorHarmony;
