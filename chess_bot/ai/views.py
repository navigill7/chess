from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

from .engine.bot import Bot
from .engine.board import Board

# Initialize bot (singleton per worker)
bot = Bot()

@csrf_exempt
@require_http_methods(["POST"])
def get_bot_move(request):
    """
    Get best move from bot using time-based search
    Request body: {
        "fen": "...",
        "time_ms": 3000  // Thinking time in milliseconds
    }
    """
    try:
        data = json.loads(request.body)
        fen = data.get('fen', Board.START_FEN)
        time_ms = data.get('time_ms', 2000)  # Default 2 seconds
        
        # Set position
        bot.set_position(fen)
        
        # Think
        move_uci, evaluation, nodes = bot.think_timed(time_ms)
        
        if move_uci is None:
            return JsonResponse({
                'success': False,
                'error': 'No legal moves available'
            }, status=400)
        
        return JsonResponse({
            'success': True,
            'move': move_uci,
            'evaluation': evaluation,
            'nodes_searched': nodes,
            'time_ms': time_ms
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def validate_move(request):
    """Validate if a move is legal"""
    try:
        data = json.loads(request.body)
        fen = data.get('fen')
        move_uci = data.get('move')
        
        if not fen or not move_uci:
            return JsonResponse({
                'success': False,
                'error': 'Missing fen or move'
            }, status=400)
        
        from .engine.board import Board
        from .engine.move import Move
        from .engine.move_generator import MoveGenerator
        
        board = Board(fen)
        move = Move.from_uci(move_uci)
        
        gen = MoveGenerator()
        legal_moves = gen.generate_moves(board)
        legal_moves_uci = [m.to_uci() for m in legal_moves]
        
        is_legal = move_uci in legal_moves_uci
        
        if is_legal:
            board.make_move(move)
            new_fen = board.to_fen()
        else:
            new_fen = None
        
        return JsonResponse({
            'success': True,
            'legal': is_legal,
            'new_fen': new_fen,
            'legal_moves': legal_moves_uci
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)

@require_http_methods(["GET"])
def health_check(request):
    """Health check endpoint"""
    return JsonResponse({
        'status': 'healthy',
        'service': 'chess-bot'
    })