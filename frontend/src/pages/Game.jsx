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
  const [connectionError, setConnectionError] = useState(null);
  const [chatMessageHandler, setChatMessageHandler] = useState(null);

  const [drawOffer, setDrawOffer] = useState(null);
  const [showDrawOfferModal, setShowDrawOfferModal] = useState(false);

  // HANDLER FUNCTIONS
  // Define all handler functions before WebSocket setup to avoid circular dependencies

  const initializeGame = useCallback((data) => {
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
      setPlayerColor('white');
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
  }, [user]);

  const handleOpponentMove = useCallback((data) => {
    console.log('Move event received:', data);
    
    const moveData = data.move;
    
    if (!moveData) {
      console.error('No move data in event:', data);
      return;
    }
    
    // Remove optimistic move and replace with confirmed move
    setMoves(prev => {
      // Filter out optimistic moves
      const confirmed = prev.filter(m => !m.optimistic);
      
      // Add server-confirmed move
      const serverMove = {
        from: moveData.from,
        to: moveData.to,
        piece: moveData.piece,
        captured: moveData.captured,
        notation: moveData.notation,
        color: moveData.color,
        timestamp: moveData.timestamp || Date.now(),
        sequence: moveData.sequence,
      };
      
      return [...confirmed, serverMove];
    });
    
    // Update board from FEN if provided
    if (data.fen) {
      const newBoard = new Board(data.fen);
      setBoard(newBoard);
      setValidator(new MoveValidator(newBoard));
    }
    
    setCurrentMoveIndex(prev => prev + 1);

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
      status: moveData.status || prev.status,
      turn: moveData.next_turn || (prev.turn === 'white' ? 'black' : 'white'),
      check: moveData.is_check ? moveData.next_turn : null,
      winner: moveData.winner || prev.winner,
      lastMove: { from: moveData.from, to: moveData.to },
    }));
  }, []);

  const applyStateSnapshot = useCallback((data) => {
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
  }, []);

const handleGameEnd = useCallback((data) => {
  setGameState(prev => ({
    ...prev,
    status: data.status,
    winner: data.winner,
    reason: data.reason || data.termination,
  }));

  if (data.rating_changes) {
    console.log('Rating changes:', data.rating_changes);
  }
  }, []);

  const rollbackOptimisticMove = useCallback((sendFunc) => {
    // Remove last optimistic move and restore board state
    setMoves(prev => prev.filter(m => !m.optimistic));
    
    // Request current state from server
    if (sendFunc) {
      sendFunc({ type: 'join_game' });
    }
  }, []);

  // WebSocket message handler
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

      case 'draw_offer':
        setDrawOffer({
          from: data.offer_from,
          username: data.username,
        });
        setShowDrawOfferModal(true);
        break;

      case 'draw_declined':
        setError('Draw offer was declined');
        setTimeout(() => setError(null), 3000);
        break;

      case 'chat_message':
        if (chatMessageHandler) {
          chatMessageHandler(data);
        }
        break;

      case 'error':
        console.error('Game error:', data.message);
        setError(data.message);
        break;
        
      default:
        console.warn('Unknown message type:', data.type);
    }
  }, [chatMessageHandler, initializeGame, handleOpponentMove, applyStateSnapshot, handleGameEnd]);

  // WEBSOCKET SETUP

  const handleOpen = useCallback(() => {
    console.log('WebSocket connected');
    setConnectionError(null);
  }, []);

  const handleMessage = useCallback((data) => {
    handleWebSocketMessage(data);
  }, [handleWebSocketMessage]);

  const handleError = useCallback((err) => {
    console.error('WebSocket error:', err);
    setConnectionError('Connection failed. Please check your internet.');
  }, []);

  const handleClose = useCallback((event) => {
    console.log('WebSocket closed', event.code);
    if (event.code === 1008 || event.code === 4001) {
      setConnectionError('Session expired. Please login again.');
      setTimeout(() => navigate('/login'), 3000);
    }
  }, [navigate]);

  const handleAcceptDraw = useCallback(() => {
    if (send) {
      send({ type: 'accept_draw' });
      setShowDrawOfferModal(false);
      setDrawOffer(null);
    }
  }, [send]);

  // 4. ADD NEW HANDLER FOR DECLINING DRAW
  // ADD this new function after handleAcceptDraw

  const handleDeclineDraw = useCallback(() => {
    if (send) {
      send({ type: 'decline_draw' });
      setShowDrawOfferModal(false);
      setDrawOffer(null);
    }
  }, [send]);

  const { isConnected, lastMessage, send, error: wsError } = useWebSocket(`/ws/game/${gameId}/`, {
    onOpen: handleOpen,
    onMessage: handleMessage,
    onError: handleError,
    onClose: handleClose,
    reconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 3,
  });

  // Send join_game after WebSocket is connected
  useEffect(() => {
    if (isConnected && send) {
      console.log('Joining game...');
      send({ type: 'join_game' });
    }
  }, [isConnected, send]);

  // GAME LOGIC

  const handleMove = useCallback((from, to) => {
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
  }, [isSpectator, gameState.status, board, playerColor]);

  const handlePromotion = useCallback((promotionPiece) => {
    setShowPromotionModal(false);
    if (pendingMove) {
      executeMove(pendingMove.from, pendingMove.to, promotionPiece);
      setPendingMove(null);
    }
  }, [pendingMove]);

  const executeMove = useCallback((from, to, promotion) => {
    // OPTIMISTIC UPDATE - Show move immediately for instant feedback
    const tempBoard = board.clone();
    const piece = tempBoard.getPiece(from);
    
    if (!piece) return;
    
    if (promotion && piece.type === 'pawn') {
      piece.type = promotion;
    }
    
    const capturedPiece = tempBoard.getPiece(to);
    
    // Make the move on temp board
    tempBoard.board[to] = piece;
    delete tempBoard.board[from];
    tempBoard.turn = tempBoard.turn === 'white' ? 'black' : 'white';
    
    // Update UI immediately (optimistic)
    setBoard(tempBoard);
    setValidator(new MoveValidator(tempBoard));
    
    // Add to move history with optimistic flag
    const tempMove = {
      from,
      to,
      piece: piece.type,
      captured: capturedPiece?.type,
      notation: `${from}-${to}`,
      color: board.turn,
      optimistic: true,  // Flag for rollback if server rejects
      timestamp: Date.now(),
    };
    
    setMoves(prev => [...prev, tempMove]);
    setCurrentMoveIndex(prev => prev + 1);
    
    // Update captured pieces optimistically
    if (capturedPiece) {
      setCapturedPieces(prev => ({
        ...prev,
        [board.turn]: [...prev[board.turn], capturedPiece.type],
      }));
    }
    
    // Send to server
    if (send) {
      send({
        type: 'move',
        payload: { from, to, promotion, timestamp: Date.now() },
      });
    }
  }, [board, send]);

  const handleMoveClick = useCallback((index) => {
    if (send) {
      send({
        type: 'jump_to_move',
        payload: {
          move_index: index,
        },
      });
    }
  }, [send]);

  const handleResign = useCallback(() => {
    if (send) {
      send({ type: 'resign' });
    }
  }, [send]);

  const handleOfferDraw = useCallback(() => {
    if (send) {
      send({ type: 'offer_draw' });
    }
  }, [send]);

  const handleRequestTakeback = useCallback(() => {
    if (send) {
      send({ type: 'request_takeback' });
    }
  }, [send]);

  const getValidMoves = useCallback((square) => {
    return validator.getPieceMoves(square);
  }, [validator]);

  const registerChatHandler = useCallback((handler) => {
    setChatMessageHandler(() => handler);
  }, []);

  // RENDER 

  return (
    <div className="container mx-auto max-w-7xl h-[calc(100vh-150px)]">
      {/* Connection Error Display */}
      {connectionError && (
        <div className="fixed top-20 right-6 bg-orange-500/90 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {connectionError}
          <button onClick={() => setConnectionError(null)} className="ml-4 font-bold">×</button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed top-20 right-6 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-bold">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_280px] gap-4 h-full">
        {/* Left Sidebar */}
        <div className="space-y-6">
          <GameClock
            initialTime={playerColor === 'white' ? blackTime : whiteTime}
            increment={timeIncrement}
            isActive={gameState.status === 'ongoing' && gameState.turn !== playerColor}
            color={playerColor === 'white' ? 'black' : 'white'}
            playerName={playerColor === 'white' ? blackPlayer?.username : whitePlayer?.username}
            playerRating={playerColor === 'white' ? blackPlayer?.rating : whitePlayer?.rating}
          />

          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
            <CapturedPieces
              capturedPieces={capturedPieces}
              color={playerColor === 'white' ? 'black' : 'white'}
            />
          </div>

          <GameControls
            isSpectator={isSpectator}
            onResign={handleResign}
            onOfferDraw={handleOfferDraw}
            onRequestTakeback={handleRequestTakeback}
            gameStatus={gameState.status}
            drawOfferReceived={showDrawOfferModal}
            onAcceptDraw={handleAcceptDraw}
            onDeclineDraw={handleDeclineDraw}
          />
        </div>

        {/* Center - Board */}
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

        {/* Right Sidebar */}
        <div className="space-y-6">
          <GameClock
            initialTime={playerColor === 'white' ? whiteTime : blackTime}
            increment={timeIncrement}
            isActive={gameState.status === 'ongoing' && gameState.turn === playerColor}
            color={playerColor || 'white'}
            playerName={playerColor === 'white' ? whitePlayer?.username : blackPlayer?.username}
            playerRating={playerColor === 'white' ? whitePlayer?.rating : blackPlayer?.rating}
          />

          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
            <CapturedPieces
              capturedPieces={capturedPieces}
              color={playerColor || 'white'}
            />
          </div>

          <MoveHistory
            moves={moves.filter(m => !m.optimistic)}
            currentMoveIndex={currentMoveIndex}
            onMoveClick={handleMoveClick}
          />

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

      {/* Draw Offer Modal */}
      <DrawOfferModal
        isOpen={showDrawOfferModal}
        offerFrom={drawOffer}
        onAccept={handleAcceptDraw}
        onDecline={handleDeclineDraw}
      />

      {/* Promotion Modal */}
      <PromotionModal
        isOpen={showPromotionModal}
        color={playerColor}
        onSelect={handlePromotion}
      />
    </div>
  );
}

function DrawOfferModal({ isOpen, offerFrom, onAccept, onDecline }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-purple-500/50 shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <Handshake className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Draw Offer</h2>
          <p className="text-white/80">
            {offerFrom?.username} offers a draw
          </p>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={onDecline}
            className="flex-1 px-6 py-3 rounded-lg font-semibold bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="flex-1 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white transition-all"
          >
            Accept Draw
          </button>
        </div>
      </div>
    </div>
  );
}

export default Game;