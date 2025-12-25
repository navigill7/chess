import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Cpu, RotateCcw, Home, Loader2 } from "lucide-react";

import ChessBoard from "../components/chess/ChessBoard";
import MoveHistory from "../components/chess/MoveHistory";
import CapturedPieces from "../components/chess/CapturedPieces";
import PromotionModal from "../components/chess/PromotionModal";

import Board from "../chess/Board";
import MoveValidator from "../chess/MoveValidator";
import botService from "../services/botService";

function BotGame() {
  const navigate = useNavigate();
  const { gameId: urlGameId } = useParams();

  // Game session
  const [gameId, setGameId] = useState(urlGameId || null);
  const [gameLoaded, setGameLoaded] = useState(false);

  // Game state
  const [board, setBoard] = useState(new Board());
  const [validator, setValidator] = useState(new MoveValidator(board));
  const [gameState, setGameState] = useState({
    status: "ongoing",
    turn: "white",
    check: null,
    winner: null,
    lastMove: null,
  });

  // Bot settings
  const [difficulty, setDifficulty] = useState("medium");
  const [playerColor, setPlayerColor] = useState("white");
  const [gameStarted, setGameStarted] = useState(false);
  const [botThinking, setBotThinking] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // UI state
  const [moves, setMoves] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [capturedPieces, setCapturedPieces] = useState({
    white: [],
    black: [],
  });
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  const [error, setError] = useState(null);

  // Load existing game if gameId exists in URL
  useEffect(() => {
    if (urlGameId && !gameLoaded) {
      loadExistingGame(urlGameId);
    } else if (!urlGameId) {
      // No game ID in URL, show difficulty selection
      setGameLoaded(true);
    }
  }, [urlGameId]);

  const loadExistingGame = async (gId) => {
    try {
      const result = await botService.getGame(gId);
      if (result.success) {
        setGameId(gId);
        setDifficulty(result.difficulty);
        setPlayerColor(result.player_color);

        // Load board state
        const newBoard = new Board();
        newBoard.loadFen(result.fen);
        setBoard(newBoard);
        setValidator(new MoveValidator(newBoard));

        setGameState({
          status: "ongoing",
          turn: newBoard.turn,
          check: null,
          winner: null,
          lastMove: null,
        });

        setGameLoaded(true);
      } else {
        setError("Game not found");
        setTimeout(() => navigate("/"), 2000);
      }
    } catch (err) {
      console.error("Load game error:", err);
      setError("Failed to load game");
      setTimeout(() => navigate("/"), 2000);
    }
  };

  // Update validator when board changes
  useEffect(() => {
    setValidator(new MoveValidator(board));
  }, [board]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameId) {
        botService.deleteGame(gameId);
      }
    };
  }, [gameId]);

  const executeMove = useCallback(
    (from, to, promotion = null) => {
      if (!validator.isValidMove(from, to, promotion)) {
        setError("Invalid move");
        setTimeout(() => setError(null), 3000);
        return false;
      }

      const piece = board.getPiece(from);
      const capturedPiece = board.getPiece(to);

      // Create new board
      const newBoard = board.clone();
      validator.makeMove(newBoard, from, to, promotion);

      setBoard(newBoard);

      // Update captured pieces
      if (capturedPiece) {
        setCapturedPieces((prev) => ({
          ...prev,
          [piece.color]: [...prev[piece.color], capturedPiece.type],
        }));
      }

      // Add move to history
      const move = {
        from,
        to,
        piece: piece.type,
        captured: capturedPiece?.type,
        promotion,
        notation: `${from}-${to}${promotion ? "=" + promotion : ""}`,
        color: board.turn,
        timestamp: Date.now(),
      };

      setMoves((prev) => [...prev, move]);
      setCurrentMoveIndex((prev) => prev + 1);

      // Update game state
      const status = validator.getGameStatus();
      setGameState({
        ...status,
        turn: newBoard.turn,
        lastMove: { from, to },
      });

      return true;
    },
    [board, validator]
  );

  const handlePlayerMove = useCallback(
    async (from, to) => {
      if (
        !gameId ||
        botThinking ||
        gameState.status !== "ongoing" ||
        gameState.turn !== playerColor
      ) {
        return;
      }

      const piece = board.getPiece(from);
      if (!piece || piece.color !== playerColor) {
        return;
      }

      // Check for pawn promotion
      if (piece.type === "pawn") {
        const toCoord = board.squareToCoordinate(to);
        const promotionRank = piece.color === "white" ? 7 : 0;

        if (toCoord.rank === promotionRank) {
          setPendingMove({ from, to });
          setShowPromotionModal(true);
          return;
        }
      }

      // Execute player move and send to backend
      await executeMoveAndGetBotResponse(from, to, null);
    },
    [gameId, botThinking, gameState, playerColor, board]
  );

  const executeMoveAndGetBotResponse = async (from, to, promotion = null) => {
    setBotThinking(true);
    setError(null);

    try {
      // Validate and execute player move locally first
      const moveSuccess = executeMove(from, to, promotion);
      if (!moveSuccess) {
        setBotThinking(false);
        return;
      }

      // Send move to backend and get bot response
      const move = from + to + (promotion || "");
      const result = await botService.makeMove(gameId, move);

      if (result.success) {
        // Add artificial delay for UX
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Apply bot move if provided
        if (result.bot_move) {
          const botMove = result.bot_move;
          const botFrom = botMove.substring(0, 2);
          const botTo = botMove.substring(2, 4);
          const botPromo = botMove.length > 4 ? botMove[4] : null;

          executeMove(botFrom, botTo, botPromo);
        }

        // Check game over
        if (result.game_over) {
          setGameState((prev) => ({
            ...prev,
            status: "finished",
            winner: result.winner,
            result: result.result,
          }));
        }
      } else {
        setError(result.error || "Failed to get bot response");
      }
    } catch (err) {
      console.error("Move error:", err);
      setError("Move failed: " + err.message);
    } finally {
      setBotThinking(false);
    }
  };

  const handlePromotion = useCallback(
    async (promotionPiece) => {
      setShowPromotionModal(false);
      if (pendingMove) {
        await executeMoveAndGetBotResponse(
          pendingMove.from,
          pendingMove.to,
          promotionPiece
        );
        setPendingMove(null);
      }
    },
    [pendingMove]
  );

  const startNewGame = async (selectedDifficulty, selectedColor) => {
    setError(null);
    setIsInitializing(true);

    try {
      const result = await botService.createGame(
        selectedColor,
        selectedDifficulty
      );

      if (result.success) {
        const createdGameId = result.game_id; // Store in variable, not state yet

        setGameId(createdGameId);
        setDifficulty(selectedDifficulty);
        setPlayerColor(selectedColor);
        setGameStarted(true);
        setShowSettings(false);

        const newBoard = new Board();
        if (result.starting_fen) {
          newBoard.loadFen(result.starting_fen);
        }
        setBoard(newBoard);
        setValidator(new MoveValidator(newBoard));

        setGameState({
          status: "ongoing",
          turn: newBoard.turn,
          check: null,
          winner: null,
          lastMove: null,
        });
        setMoves([]);
        setCurrentMoveIndex(-1);
        setCapturedPieces({ white: [], black: [] });
        setBotThinking(false);

        // If bot moves first
        if (result.bot_first_move) {
          const move = result.bot_first_move;
          const from = move.substring(0, 2);
          const to = move.substring(2, 4);
          const promotion = move.length > 4 ? move[4] : null;

          setTimeout(() => executeMove(from, to, promotion), 300);
        }
      } else {
        setError("Failed to create game");
      }
    } catch (err) {
      console.error("Start game error:", err);
      setError("Failed to create game: " + err.message);
    } finally {
      setIsInitializing(false);
    }
  };

  const resetGame = async () => {
    if (gameId) {
      await botService.deleteGame(gameId);
    }

    setGameId(null);
    setGameStarted(false);
    setShowSettings(true);
    setBoard(new Board());
    setMoves([]);
    setCapturedPieces({ white: [], black: [] });
    setGameState({
      status: "ongoing",
      turn: "white",
      check: null,
      winner: null,
    });
    setError(null);
  };

  const getValidMoves = useCallback(
    (square) => {
      return validator.getPieceMoves(square);
    },
    [validator]
  );

  // Difficulty selection screen
  // Settings screen - shown before game starts
  if (!gameStarted) {
    return (
      <div className="container mx-auto max-w-4xl h-screen flex items-center justify-center">
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8 w-full max-w-2xl">
          <div className="text-center mb-8">
            <Cpu className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-2">
              Play Against Bot
            </h1>
            <p className="text-white/60">Configure your game settings</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Difficulty Selection */}
            <div>
              <h3 className="text-white font-semibold mb-3">
                Select Difficulty
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    level: "easy",
                    label: "Easy",
                    time: "0.5s",
                    icon: "😊",
                    desc: "Beginner friendly",
                  },
                  {
                    level: "medium",
                    label: "Medium",
                    time: "2s",
                    icon: "🤔",
                    desc: "Balanced challenge",
                  },
                  {
                    level: "hard",
                    label: "Hard",
                    time: "5s",
                    icon: "😈",
                    desc: "Advanced play",
                  },
                ].map((diff) => (
                  <button
                    key={diff.level}
                    onClick={() => setDifficulty(diff.level)}
                    className={`p-6 rounded-xl transition-all duration-300 border-2 ${
                      difficulty === diff.level
                        ? "bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-purple-500"
                        : "bg-white/5 border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="text-4xl mb-2">{diff.icon}</div>
                    <div className="text-white font-semibold text-lg">
                      {diff.label}
                    </div>
                    <div className="text-white/60 text-sm">{diff.time}</div>
                    <div className="text-white/40 text-xs mt-1">
                      {diff.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <h3 className="text-white font-semibold mb-3">
                Choose Your Color
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setPlayerColor("white")}
                  className={`p-6 rounded-xl transition-all border-2 ${
                    playerColor === "white"
                      ? "bg-white/20 border-white"
                      : "bg-white/5 border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="text-4xl mb-2">♔</div>
                  <div className="text-white font-semibold">Play as White</div>
                  <div className="text-white/60 text-sm">You move first</div>
                </button>
                <button
                  onClick={() => setPlayerColor("black")}
                  className={`p-6 rounded-xl transition-all border-2 ${
                    playerColor === "black"
                      ? "bg-gray-900/50 border-gray-400"
                      : "bg-gray-900/20 border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="text-4xl mb-2">♚</div>
                  <div className="text-white font-semibold">Play as Black</div>
                  <div className="text-white/60 text-sm">Bot moves first</div>
                </button>
              </div>
            </div>

            {/* Start Game Button */}
            <button
              onClick={() => startNewGame(difficulty, playerColor)}
              disabled={isInitializing}
              className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isInitializing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Starting Game...</span>
                </>
              ) : (
                <span>Start Game</span>
              )}
            </button>

            <button
              onClick={() => navigate("/")}
              className="w-full flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 text-white rounded-lg p-3 transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game screen
  return (
    <div className="container mx-auto max-w-7xl h-[calc(100vh-150px)]">
      {error && (
        <div className="fixed top-20 right-6 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-bold">
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_280px] gap-4 h-full">
        {/* Left Sidebar - Bot Info */}
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Cpu className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-white font-semibold">Chess Bot</p>
                <p className="text-white/60 text-sm capitalize">
                  {difficulty} Level
                </p>
              </div>
            </div>
            {botThinking && (
              <div className="flex items-center space-x-2 text-purple-400 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
          </div>

          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
            <CapturedPieces
              capturedPieces={capturedPieces}
              color={playerColor === "white" ? "black" : "white"}
            />
          </div>

          <button
            onClick={resetGame}
            className="w-full flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 text-white rounded-lg p-3 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Game</span>
          </button>
        </div>

        {/* Center - Chess Board */}
        <div className="flex items-center justify-center min-h-0 h-full">
          <div className="w-full h-full max-w-[min(90vh,90vw)] max-h-[min(90vh,90vw)]">
            <ChessBoard
              gameState={{
                board: board.board,
                turn: board.turn,
                check: gameState.check,
                status: gameState.status,
                winner: gameState.winner,
                lastMove: gameState.lastMove,
              }}
              onMove={handlePlayerMove}
              isSpectator={false}
              playerColor={playerColor}
              getValidMoves={getValidMoves}
            />
          </div>
        </div>

        {/* Right Sidebar - Player Info & History */}
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                  playerColor === "white"
                    ? "bg-white text-gray-900"
                    : "bg-gray-900 text-white"
                }`}
              >
                {playerColor === "white" ? "♔" : "♚"}
              </div>
              <div>
                <p className="text-white font-semibold">You</p>
                <p className="text-white/60 text-sm capitalize">
                  {playerColor}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
            <CapturedPieces
              capturedPieces={capturedPieces}
              color={playerColor}
            />
          </div>

          <MoveHistory
            moves={moves}
            currentMoveIndex={currentMoveIndex}
            onMoveClick={() => {}}
          />
        </div>
      </div>

      <PromotionModal
        isOpen={showPromotionModal}
        color={playerColor}
        onSelect={handlePromotion}
      />
    </div>
  );
}

export default BotGame;
