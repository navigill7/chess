import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useWebSocket from '../services/socketService';

import ChessBoard from '../components/chess/ChessBoard';
import GameClock from '../components/chess/GameClock';
import GameControls from '../components/chess/GameControls';
import MoveHistory from '../components/chess/MoveHistory';
import CapturedPieces from '../components/chess/CapturedPieces';
import ChatBox from '../components/chess/ChatBox';
import PromotionModal from '../components/chess/PromotionModal';

import Board from '../chess/Board';
import MoveValidator from '../chess/MoveValidator';

function Game() {
  const { gameId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Game state
  const [board, setBoard] = useState(new Board());
  const [validator, setValidator] = useState(new MoveValidator(board));
  const [gameState, setGameState] = useState({
    status: 'ongoing',
    turn: 'white',
    check: null,
    winner: null,
  });

  // Player info
  const [whitePlayer, setWhitePlayer] = useState(null);
  const [blackPlayer, setBlackPlayer] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [isSpectator, setIsSpectator] = useState(false);

  // Timers
  const [whiteTime, setWhiteTime] = useState(300000);
  const [blackTime, setBlackTime] = useState(300000);
  const [timeIncrement, setTimeIncrement] = useState(0);

  // Move history
  const [moves, setMoves] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });

  // UI state
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  const [error, setError] = useState(null);
  const [drawOfferPending, setDrawOfferPending] = useState(false);
  const [takebackRequest, setTakebackRequest] = useState(false);

  // Chat message handler
  const [chatMessageHandler, setChatMessageHandler] = useState(null);

  // WebSocket connection
  const { isConnected, lastMessage, send } = useWebSocket(`/ws/game/${gameId}/`, {
    onOpen: () => {
      console.log('WebSocket connected, joining game...');
      send({ type: 'join_game' });
    },
    onMessage: (data) => {
      handleWebSocketMessage(data);
    },
  });

  const handleWebSocketMessage = useCallback((data) => {
    console.log('WebSocket message received:', data.type);
    
    switch (data.type) {
      case 'game_state':
        initializeGame(data);
        break;

      case 'move_made':
        handleOpponentMove(data);
        break;

      case 'clock_sync':
        setWhiteTime(data.white_time);
        setBlackTime(data.black_time);
        break;

      case 'state_snapshot':
        applyStateSnapshot(data);
        break;

      case 'game_ended':
        handleGameEnd(data);
        break;

      case 'chat_message':
        // Pass to ChatBox component via callback
        if (chatMessageHandler) {
          chatMessageHandler(data);
        }
        break;

      case 'draw_offered':
        setDrawOfferPending(true);
        break;

      case 'takeback_requested':
        setTakebackRequest(true);
        break;

      case 'error':
        console.error('Game error:', data.message);
        setError(data.message);
        break;
        
      default:
        console.warn('Unknown message type:', data.type);
    }
  }, [chatMessageHandler]);

  const initializeGame = (data) => {
    console.log('Initializing game with data:', data);
    
    // Set players
    setWhitePlayer(data.white_player);
    setBlackPlayer(data.black_player);

    // Determine player color
    if (user?.id === data.white_player?.id) {
      setPlayerColor('white');
      setIsSpectator(false);
    } else if (user?.id === data.black_player?.id) {
      setPlayerColor('black');
      setIsSpectator(false);
    } else {
      setIsSpectator(true);
      setPlayerColor('white'); // Default view for spectators
    }

    // Load board from FEN
    const newBoard = new Board(data.fen);
    setBoard(newBoard);
    setValidator(new MoveValidator(newBoard));

    // Set time control
    setWhiteTime(data.white_time);
    setBlackTime(data.black_time);
    setTimeIncrement(data.increment);

    // Load move history
    setMoves(data.moves || []);
    setCurrentMoveIndex((data.moves?.length || 1) - 1);

    // Set game state
    setGameState({
      status: data.status,
      turn: data.current_turn || newBoard.turn,
      check: data.check,
      winner: data.winner,
    });
  };

const handleOpponentMove = useCallback((data) => {
  console.log('Move event received:', data);
  
  // Handle both old format (move_made) and new format (move_made_event)
  const moveData = data.event || data.move;
  const fen = data.event?.fen || data.fen || moveData.fen;
  
  if (!fen) {
    console.error('No FEN in move data:', data);
    return;
  }
  
  // Update board from server FEN (authoritative)
  const newBoard = new Board(fen);
  setBoard(newBoard);
  setValidator(new MoveValidator(newBoard));

  // Add move to history with all fields
  const moveEntry = {
    from: moveData.from,
    to: moveData.to,
    piece: moveData.piece,
    captured: moveData.captured,
    notation: moveData.notation,
    color: moveData.color,
    timestamp: moveData.timestamp || Date.now(),
    sequence: moveData.sequence || data.event?.sequence,
  };
  
  setMoves(prev => [...prev, moveEntry]);
  setCurrentMoveIndex(prev => prev + 1);

  // Update captured pieces
  if (moveData.captured) {
    setCapturedPieces(prev => ({
      ...prev,
      [moveData.color]: [...prev[moveData.color], moveData.captured],
    }));
  }

  // Update clock times (authoritative from server)
  if (data.white_time !== undefined) {
    setWhiteTime(data.white_time);
  }
  if (data.black_time !== undefined) {
    setBlackTime(data.black_time);
  }

  // Update game state
  setGameState(prev => ({
    ...prev,
    status: moveData.status || data.event?.status || prev.status,
    turn: newBoard.turn,
    check: moveData.is_check ? newBoard.turn : null,
    winner: moveData.winner || data.event?.winner || prev.winner,
    lastMove: { from: moveData.from, to: moveData.to },
  }));
}, []);

  const handleMove = (from, to) => {
    if (isSpectator) return;
    if (gameState.status !== 'ongoing') return;
    if (board.turn !== playerColor) return;

    const piece = board.getPiece(from);
    if (!piece || piece.color !== playerColor) return;

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

    executeMove(from, to, null);
  };

  const handlePromotion = (promotionPiece) => {
    setShowPromotionModal(false);
    if (pendingMove) {
      executeMove(pendingMove.from, pendingMove.to, promotionPiece);
      setPendingMove(null);
    }
  };

const executeMove = (from, to, promotion) => {
  // NO optimistic update - just send and wait
  send({
    type: 'move',
    payload: { from, to, promotion, timestamp: Date.now() },
  });
};

  const applyStateSnapshot = (data) => {
    // Used when jumping to a specific move
    const newBoard = new Board(data.fen);
    setBoard(newBoard);
    setValidator(new MoveValidator(newBoard));
    
    setWhiteTime(data.white_time);
    setBlackTime(data.black_time);
    setCurrentMoveIndex(data.move_index);
    
    setGameState(prev => ({
      ...prev,
      turn: newBoard.turn,
      check: data.check,
      lastMove: data.last_move,
    }));
  };

  const handleMoveClick = (index) => {
    // Request state snapshot at specific move from server
    send({
      type: 'jump_to_move',
      payload: {
        move_index: index,
      },
    });
  };

  const handleGameEnd = (data) => {
    setGameState({
      status: data.status,
      turn: board.turn,
      winner: data.winner,
      reason: data.reason,
    });
  };

  const handleResign = () => {
    send({ type: 'resign' });
  };

  const handleOfferDraw = () => {
    send({ type: 'offer_draw' });
  };

  const handleRequestTakeback = () => {
    send({ type: 'request_takeback' });
  };

  const getValidMoves = (square) => {
    return validator.getPieceMoves(square);
  };

  const registerChatHandler = (handler) => {
    setChatMessageHandler(() => handler);
  };

  return (
    <div className="container mx-auto max-w-7xl h-[calc(100vh-150px)]">
      {/* Error Display */}
      {error && (
        <div className="fixed top-20 right-6 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-bold">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_280px] gap-4 h-full">
        {/* Left Sidebar - Player Info & Controls */}
        <div className="space-y-6">
          {/* Opponent Clock */}
          <GameClock
            initialTime={playerColor === 'white' ? blackTime : whiteTime}
            increment={timeIncrement}
            isActive={
              gameState.status === 'ongoing' &&
              gameState.turn !== playerColor
            }
            color={playerColor === 'white' ? 'black' : 'white'}
            playerName={
              playerColor === 'white' ? blackPlayer?.username : whitePlayer?.username
            }
            playerRating={
              playerColor === 'white' ? blackPlayer?.rating : whitePlayer?.rating
            }
          />

          {/* Captured Pieces (Opponent) */}
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
            <CapturedPieces
              capturedPieces={capturedPieces}
              color={playerColor === 'white' ? 'black' : 'white'}
            />
          </div>

          {/* Game Controls */}
          <GameControls
            isSpectator={isSpectator}
            onResign={handleResign}
            onOfferDraw={handleOfferDraw}
            onRequestTakeback={handleRequestTakeback}
            gameStatus={gameState.status}
          />
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
                lastMove: moves[moves.length - 1],
              }}
              onMove={handleMove}
              isSpectator={isSpectator}
              playerColor={playerColor || 'white'}
              getValidMoves={getValidMoves}
            />
          </div>
        </div>

        {/* Right Sidebar - Move History & Chat */}
        <div className="space-y-6">
          {/* Player Clock */}
          <GameClock
            initialTime={playerColor === 'white' ? whiteTime : blackTime}
            increment={timeIncrement}
            isActive={
              gameState.status === 'ongoing' &&
              gameState.turn === playerColor
            }
            color={playerColor || 'white'}
            playerName={
              playerColor === 'white' ? whitePlayer?.username : blackPlayer?.username
            }
            playerRating={
              playerColor === 'white' ? whitePlayer?.rating : blackPlayer?.rating
            }
          />

          {/* Captured Pieces (Player) */}
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
            <CapturedPieces
              capturedPieces={capturedPieces}
              color={playerColor || 'white'}
            />
          </div>

          {/* Move History */}
          <MoveHistory
            moves={moves}
            currentMoveIndex={currentMoveIndex}
            onMoveClick={handleMoveClick}
          />

          {/* Chat */}
          <div className="h-64">
            <ChatBox
              gameId={gameId}
              isPlayerChat={!isSpectator}
              currentUser={user}
              websocketSend={send}
              onMessage={registerChatHandler}
            />
          </div>
        </div>
      </div>

      {/* Promotion Modal */}
      <PromotionModal
        isOpen={showPromotionModal}
        color={playerColor}
        onSelect={handlePromotion}
      />

      {/* Draw Offer Notification */}
      {drawOfferPending && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 rounded-xl p-6 shadow-2xl z-50">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Draw Offer</h3>
          <p className="text-gray-700 mb-4">Your opponent offers a draw</p>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                send({ type: 'accept_draw' });
                setDrawOfferPending(false);
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              Accept
            </button>
            <button
              onClick={() => setDrawOfferPending(false)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Decline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Game;