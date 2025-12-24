"""
Improved Django views with game session support and better bot configuration.
"""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

from .engine.bot import Bot
from .engine.board import Board
from .game_session import game_manager


# Bot instances with different difficulty levels
# We keep multiple bot instances to avoid conflicts between games
class BotPool:
    """Pool of bot instances for handling multiple games"""
    
    def __init__(self):
        self.bots = {}
        self.max_bots = 100  # Maximum concurrent games
    
    def get_bot(self, game_id: str, difficulty: str = 'medium') -> Bot:
        """Get or create bot for game"""
        if game_id not in self.bots:
            if len(self.bots) >= self.max_bots:
                # Remove oldest bot
                oldest = min(self.bots.keys())
                del self.bots[oldest]
            
            bot = Bot()
            # Configure bot based on difficulty
            if difficulty == 'easy':
                bot.max_think_time_ms = 500
                bot.use_max_think_time = True
            elif difficulty == 'medium':
                bot.max_think_time_ms = 2000
                bot.use_max_think_time = True
            elif difficulty == 'hard':
                bot.max_think_time_ms = 5000
                bot.use_max_think_time = False
            
            self.bots[game_id] = bot
        
        return self.bots[game_id]
    
    def remove_bot(self, game_id: str):
        """Remove bot from pool"""
        if game_id in self.bots:
            del self.bots[game_id]


# Global bot pool
bot_pool = BotPool()


@csrf_exempt
@require_http_methods(["POST"])
def create_game(request):
    """
    Create a new game with unique ID.
    
    Request body: {
        "player_color": "white" or "black",
        "difficulty": "easy", "medium", or "hard"
    }
    
    Returns: {
        "success": true,
        "game_id": "uuid-here",
        "player_color": "white",
        "starting_fen": "...",
        "game_url": "/api/bot/game/{game_id}"
    }
    """
    try:
        data = json.loads(request.body) if request.body else {}
        player_color = data.get('player_color', 'white')
        difficulty = data.get('difficulty', 'medium')
        
        # Validate inputs
        if player_color not in ['white', 'black']:
            player_color = 'white'
        if difficulty not in ['easy', 'medium', 'hard']:
            difficulty = 'medium'
        
        # Create game session
        game_id = game_manager.create_game(player_color, difficulty)
        
        # Get starting position
        board = Board()
        starting_fen = board.to_fen()
        
        # If player is black, bot makes first move
        first_move = None
        if player_color == 'black':
            bot = bot_pool.get_bot(game_id, difficulty)
            bot.set_position(starting_fen)
            
            time_ms = 1000 if difficulty == 'easy' else 2000
            move_uci, evaluation, nodes = bot.think_timed(time_ms)
            
            if move_uci:
                board.make_move(Move.from_uci(move_uci))
                game_manager.update_game(game_id, board.to_fen(), move_uci)
                first_move = move_uci
        
        return JsonResponse({
            'success': True,
            'game_id': game_id,
            'player_color': player_color,
            'difficulty': difficulty,
            'starting_fen': board.to_fen(),
            'bot_first_move': first_move,
            'game_url': f'/api/bot/game/{game_id}'
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@csrf_exempt
@require_http_methods(["GET"])
def get_game(request, game_id):
    """
    Get game state.
    
    Returns: {
        "success": true,
        "game_id": "...",
        "fen": "...",
        "moves": ["e2e4", "e7e5", ...],
        "player_color": "white",
        "difficulty": "medium"
    }
    """
    try:
        session = game_manager.get_game(game_id)
        
        if not session:
            return JsonResponse({
                'success': False,
                'error': 'Game not found or expired'
            }, status=404)
        
        return JsonResponse({
            'success': True,
            'game_id': session.game_id,
            'fen': session.fen,
            'moves': session.moves,
            'player_color': session.player_color,
            'difficulty': session.difficulty
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def make_move(request, game_id):
    """
    Make a move in a specific game and get bot's response.
    
    Request body: {
        "move": "e2e4"  // UCI notation
    }
    
    Returns: {
        "success": true,
        "player_move": "e2e4",
        "bot_move": "e7e5",
        "new_fen": "...",
        "evaluation": 20,
        "game_over": false,
        "result": null
    }
    """
    try:
        # Get game session
        session = game_manager.get_game(game_id)
        if not session:
            return JsonResponse({
                'success': False,
                'error': 'Game not found or expired'
            }, status=404)
        
        # Parse request
        data = json.loads(request.body)
        player_move = data.get('move')
        
        if not player_move:
            return JsonResponse({
                'success': False,
                'error': 'No move provided'
            }, status=400)
        
        # Load current position
        board = Board(session.fen)
        
        # Make player's move
        from .engine.move import Move
        from .engine.move_generator import MoveGenerator
        
        move = Move.from_uci(player_move)
        
        # Validate move is legal
        gen = MoveGenerator()
        legal_moves = gen.generate_moves(board)
        legal_move_ucis = [m.to_uci() for m in legal_moves]
        
        if player_move not in legal_move_ucis:
            return JsonResponse({
                'success': False,
                'error': 'Illegal move',
                'legal_moves': legal_move_ucis
            }, status=400)
        
        # Apply player's move
        board.make_move(move)
        game_manager.update_game(game_id, board.to_fen(), player_move)
        
        # Check if game is over
        legal_moves_after = gen.generate_moves(board)
        
        if len(legal_moves_after) == 0:
            # Game over - checkmate or stalemate
            in_check = gen.is_in_check(board)
            result = 'checkmate' if in_check else 'stalemate'
            winner = session.player_color if in_check else None
            
            return JsonResponse({
                'success': True,
                'player_move': player_move,
                'bot_move': None,
                'new_fen': board.to_fen(),
                'game_over': True,
                'result': result,
                'winner': winner
            })
        
        # Check fifty-move rule
        if board.fifty_move_counter >= 100:
            return JsonResponse({
                'success': True,
                'player_move': player_move,
                'bot_move': None,
                'new_fen': board.to_fen(),
                'game_over': True,
                'result': 'draw',
                'reason': 'fifty_move_rule'
            })
        
        # Get bot's move
        bot = bot_pool.get_bot(game_id, session.difficulty)
        bot.set_position(board.to_fen())
        
        # Calculate think time based on difficulty
        time_ms = {
            'easy': 500,
            'medium': 2000,
            'hard': 5000
        }.get(session.difficulty, 2000)
        
        bot_move_uci, evaluation, nodes = bot.think_timed(time_ms)
        
        if not bot_move_uci:
            return JsonResponse({
                'success': False,
                'error': 'Bot failed to find a move'
            }, status=500)
        
        # Apply bot's move
        bot_move = Move.from_uci(bot_move_uci)
        board.make_move(bot_move)
        game_manager.update_game(game_id, board.to_fen(), bot_move_uci)
        
        # Check if game is over after bot's move
        legal_moves_final = gen.generate_moves(board)
        
        game_over = False
        result = None
        winner = None
        
        if len(legal_moves_final) == 0:
            game_over = True
            in_check = gen.is_in_check(board)
            result = 'checkmate' if in_check else 'stalemate'
            winner = 'bot' if in_check else None
        elif board.fifty_move_counter >= 100:
            game_over = True
            result = 'draw'
        
        return JsonResponse({
            'success': True,
            'player_move': player_move,
            'bot_move': bot_move_uci,
            'new_fen': board.to_fen(),
            'evaluation': evaluation,
            'nodes_searched': nodes,
            'game_over': game_over,
            'result': result,
            'winner': winner
        })
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_game(request, game_id):
    """Delete a game session"""
    try:
        success = game_manager.delete_game(game_id)
        bot_pool.remove_bot(game_id)
        
        if success:
            return JsonResponse({
                'success': True,
                'message': 'Game deleted'
            })
        else:
            return JsonResponse({
                'success': False,
                'error': 'Game not found'
            }, status=404)
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@require_http_methods(["GET"])
def get_stats(request):
    """Get server statistics"""
    return JsonResponse({
        'success': True,
        'active_games': game_manager.get_game_count(),
        'total_bots': len(bot_pool.bots)
    })


@require_http_methods(["GET"])
def health_check(request):
    """Health check endpoint"""
    return JsonResponse({
        'status': 'healthy',
        'service': 'chess-bot',
        'active_games': game_manager.get_game_count()
    })