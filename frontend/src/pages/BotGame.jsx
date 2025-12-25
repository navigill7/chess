import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, RotateCcw, Home, Loader2 } from 'lucide-react';

import ChessBoard from '../components/chess/ChessBoard';
import GameClock from '../components/chess/GameClock';
import MoveHistory from '../components/chess/MoveHistory';
import CapturedPieces from '../components/chess/CapturedPieces';
import PromotionModal from '../components/chess/PromotionModal';

import Board from '../chess/Board';
import MoveValidator from '../chess/MoveValidator';
import botService from '../services/botService';

function BotGame() {
  const navigate = useNavigate();

  // Game session
  const [gameId, setGameId] = useState(null);

  // Game state
  const [board, setBoard] = useState(new Board());
  const [validator, setValidator] = useState(new MoveValidator(board));
  const [gameState, setGameState] = useState({
    status: 'ongoing',
    turn: 'white',
    check: null,
    winner: null,
    lastMove: null,
  });

  // Bot settings
  const [difficulty, setDifficulty] = useState(null); // null = not started
  const [playerColor, setPlayerColor] = useState('white');
  const [botThinking, setBotThinking] = useState(false);

  // UI state
  const [moves, setMoves] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  const [error, setError] = useState(null);

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
        setError('Invalid move');
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
        notation: `${from}-${to}${promotion ? '=' + promotion : ''}`,
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
      if (!gameId || botThinking || gameState.status !== 'ongoing' || gameState.turn !== playerColor) {
        return;
      }

      const piece = board.getPiece(from);
      if (!piece || piece.color !== playerColor) {
        return;
      }

      // Check for pawn promotion
      if (piece.type === 'pawn') {
        const toCoord = board.squareToCoordinate(to);
        const promotionRank = piece.color === 'white' ? 7 : 0;

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
      const move = from + to + (promotion || '');
      const result = await botService.makeMove(gameId, move);

      if (result.success) {
        // Add artificial delay for UX
        await new Promise(resolve => setTimeout(resolve, 300));

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
          setGameState(prev => ({
            ...prev,
            status: 'finished',
            winner: result.winner,
            result: result.result
          }));
        }
      } else {
        setError('Failed to get bot response');
      }
    } catch (err) {
      console.error('Move error:', err);
      setError('Move failed: ' + err.message);
    } finally {
      setBotThinking(false);
    }
  };

  const handlePromotion = useCallback(
    async (promotionPiece) => {
      setShowPromotionModal(false);
      if (pendingMove) {
        await executeMoveAndGetBotResponse(pendingMove.from, pendingMove.to, promotionPiece);
        setPendingMove(null);
      }
    },
    [pendingMove]
  );

  const startNewGame = async (selectedDifficulty, selectedColor) => {
    setError(null);
    
    try {
      // Create game session on backend
      const result = await botService.createGame(selectedColor, selectedDifficulty);

      if (result.success) {
        setGameId(result.game_id);
        setDifficulty(selectedDifficulty);
        setPlayerColor(selectedColor);

        // Load starting position
        const newBoard = new Board();
        if (result.starting_fen) {
          newBoard.loadFen(result.starting_fen);
        }
        setBoard(newBoard);
        setValidator(new MoveValidator(newBoard));

        // Reset game state
        setGameState({
          status: 'ongoing',
          turn: newBoard.turn,
          check: null,
          winner: null,
          lastMove: null,
        });
        setMoves([]);
        setCurrentMoveIndex(-1);
        setCapturedPieces({ white: [], black: [] });
        setBotThinking(false);

        // If bot moves first (player is black)
        if (result.bot_first_move) {
          const move = result.bot_first_move;
          const from = move.substring(0, 2);
          const to = move.substring(2, 4);
          const promotion = move.length > 4 ? move[4] : null;
          
          executeMove(from, to, promotion);
        }
      } else {
        setError('Failed to create game');
      }
    } catch (err) {
      console.error('Start game error:', err);
      setError('Failed to create game: ' + err.message);
    }
  };

  const resetGame = async () => {
    // Cleanup old game
    if (gameId) {
      await botService.deleteGame(gameId);
    }
    
    // Reset to selection screen
    setGameId(null);
    setDifficulty(null);
    setBoard(new Board());
    setMoves([]);
    setCapturedPieces({ white: [], black: [] });
    setGameState({ status: 'ongoing', turn: 'white', check: null, winner: null });
    setError(null);
  };

  const getValidMoves = useCallback(
    (square) => {
      return validator.getPieceMoves(square);
    },
    [validator]
  );

  // Difficulty selection screen
  if (!difficulty) {
    return (
      <div className="container mx-auto max-w-4xl h-screen flex items-center justify-center">
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8 w-full max-w-2xl">
          <div className="text-center mb-8">
            <Cpu className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-2">Play Against Bot</h1>
            <p className="text-white/60">Choose your difficulty and color</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Difficulty Selection */}
            <div>
              <h3 className="text-white font-semibold mb-3">Select Difficulty</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { level: 'easy', label: 'Easy', time: '0.5s', icon: '😊' },
                  { level: 'medium', label: 'Medium', time: '2s', icon: '🤔' },
                  { level: 'hard', label: 'Hard', time: '5s', icon: '😈' },
                ].map((diff) => (
                  <button
                    key={diff.level}
                    onClick={() => startNewGame(diff.level, 'white')}
                    className="bg-gradient-to-br from-white/10 to-white/5 hover:from-purple-500/30 hover:to-pink-500/30 border border-white/20 rounded-xl p-6 transition-all duration-300 hover:scale-105"
                  >
                    <div className="text-4xl mb-2">{diff.icon}</div>
                    <div className="text-white font-semibold text-lg">{diff.label}</div>
                    <div className="text-white/60 text-sm">{diff.time} think time</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <h3 className="text-white font-semibold mb-3">Play As</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => startNewGame('medium', 'white')}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 text-white font-semibold transition-all"
                >
                  ♔ White
                </button>
                <button
                  onClick={() => startNewGame('medium', 'black')}
                  className="bg-gray-900/50 hover:bg-gray-900/70 border border-white/20 rounded-xl p-4 text-white font-semibold transition-all"
                >
                  ♚ Black
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 text-white rounded-lg p-3 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
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
                <p className="text-white/60 text-sm capitalize">{difficulty} Level</p>
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
            <CapturedPieces capturedPieces={capturedPieces} color={playerColor === 'white' ? 'black' : 'white'} />
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
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                playerColor === 'white' ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'
              }`}>
                {playerColor === 'white' ? '♔' : '♚'}
              </div>
              <div>
                <p className="text-white font-semibold">You</p>
                <p className="text-white/60 text-sm capitalize">{playerColor}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
            <CapturedPieces capturedPieces={capturedPieces} color={playerColor} />
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
