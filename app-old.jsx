import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Crown, Award, RefreshCw, User, Timer } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

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
    usedColors: new Set(),
  });

  const [colorGuess, setColorGuess] = useState({
    r: "",
    g: "",
    b: "",
  });

  const [timeLeft, setTimeLeft] = useState(40);
  const [timerActive, setTimerActive] = useState(false);
  const [nickname, setNickname] = useState("");
  const [playerInfo, setPlayerInfo] = useState(null);

  // Timer effect
  useEffect(() => {
    let interval;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      submitGuess();
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const colorPrompts = [
    {
      name: "Sunset Glow",
      description:
        "A warm blend of orange and pink with a hint of red. It's soft, radiant, and evokes the last rays of sunlight over the horizon.",
      rgb: { r: 255, g: 126, b: 95 },
    },
    {
      name: "Ocean Deep",
      description:
        "A rich marine blue with traces of green, reminiscent of clear tropical waters on a sunny day.",
      rgb: { r: 0, g: 105, b: 148 },
    },
    {
      name: "Forest Canopy",
      description:
        "A deep, vibrant green with subtle dark undertones, like sunlight filtering through dense leaves.",
      rgb: { r: 34, g: 139, b: 34 },
    },
    {
      name: "Desert Sand",
      description:
        "A warm, golden beige that captures the essence of sun-baked dunes under the midday sun.",
      rgb: { r: 237, g: 201, b: 175 },
    },
    {
      name: "Lavender Dream",
      description:
        "A soft, misty purple with subtle grey undertones, like a field of lavender at dawn.",
      rgb: { r: 230, g: 230, b: 250 },
    },
  ];

  const joinGame = () => {
  };

  const selectNewPrompt = () => {
  };

  const calculateDistance = (guess, target) => {
  };

  const handleColorInput = (component, value) => {
  };

  const submitGuess = () => {
  };

  const finishGame = () => {
  };

  const getWinner = () => {
  };

  const ColorDisplay = ({ color, label }) => (
  );

  const TimerDisplay = () => (
  );

  const LeaderboardCard = () => (
  );

  if (gameState.phase === "setup" || !playerInfo) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Join Color Harmony</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Your Nickname
                </label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter nickname (min 2 characters)"
                  className="w-full"
                />
              </div>
              <Button
                onClick={joinGame}
                disabled={nickname.trim().length < 2}
                className="w-full"
              >
                <User className="mr-2 h-4 w-4" />
                Join Game
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Color Harmony
              <Users className="ml-2" />
              <span className="text-sm font-normal">
                Players: {gameState.players.length}/10
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Crown className="text-yellow-500" />
              <span className="text-sm">
                Round {gameState.roundNumber} of {gameState.maxRounds}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {gameState.phase === "ended" ? (
            <Alert className="mb-6">
              <AlertTitle>Game Over!</AlertTitle>
              <AlertDescription>
                {getWinner()[0]} wins with {getWinner()[1]} points! 🎉
              </AlertDescription>
            </Alert>
          ) : (
            gameState.currentPrompt && (
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-xl font-bold mb-2">
                  {gameState.currentPrompt.name}
                </h3>
                <p className="text-gray-600">
                  {gameState.currentPrompt.description}
                </p>
              </div>
            )
          )}

          {gameState.phase !== "ended" && (
            <>
              {gameState.phase === "input" && <TimerDisplay />}

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Red (0-255)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="255"
                    value={colorGuess.r}
                    onChange={(e) => handleColorInput("r", e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Green (0-255)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="255"
                    value={colorGuess.g}
                    onChange={(e) => handleColorInput("g", e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Blue (0-255)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="255"
                    value={colorGuess.b}
                    onChange={(e) => handleColorInput("b", e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex justify-center gap-6 mb-6">
                <ColorDisplay color={colorGuess} label="Your Guess" />
                {gameState.phase === "results" && gameState.targetColor && (
                  <ColorDisplay
                    color={gameState.targetColor}
                    label="Target Color"
                  />
                )}
              </div>

              <div className="flex justify-center gap-4">
                {gameState.phase === "input" &&
                !gameState.guesses[playerInfo.nickname] ? (
                  <Button onClick={submitGuess} className="px-6">
                    Submit Guess
                  </Button>
                ) : (
                  gameState.phase === "results" &&
                  (gameState.roundNumber < gameState.maxRounds ? (
                    <Button
                      onClick={selectNewPrompt}
                      className="px-6"
                      variant="outline"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Next Color
                    </Button>
                  ) : (
                    <Button
                      onClick={finishGame}
                      className="px-6"
                      variant="outline"
                    >
                      See Final Results
                    </Button>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <LeaderboardCard />
    </div>
  );
};

export default ColorHarmony;