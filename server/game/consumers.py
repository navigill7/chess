import asyncio
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from datetime import datetime


class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.room_group_name = f'game_{self.game_id}'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # subscribe to clock
        self.clock_manager = GameClockManager.get_or_create(self.game_id)
        self.clock_manager.subscribe(self.channel_name)
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Cancel clock sync task
        if hasattr(self, 'clock_manager'):
            self.clock_manager.unsubscribe(self.channel_name)
        
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def clock_tick(self, event):
        await self.send(json.dumps({
            'type': 'clock_sync',
            'white_time': event['white_time'],
            'black_time': event['black_time'],
        }))

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type')
        payload = data.get('payload', {})
        
        if msg_type == 'join_game':
            await self.join_game()
        elif msg_type == 'move':
            await self.make_move(payload)
        elif msg_type == 'chat':
            await self.handle_chat(payload)
        elif msg_type == 'jump_to_move':
            await self.jump_to_move(payload)
        elif msg_type == 'clock_request':
            await self.send_clock_sync()
        elif msg_type == 'resign':
            await self.resign()
        elif msg_type == 'offer_draw':
            await self.offer_draw()
    
    async def join_game(self):
        game = await self.get_game()
        if not game:
            await self.send(json.dumps({
                'type': 'error',
                'message': 'Game not found'
            }))
            return
        
        moves = await self.get_moves()
        
        await self.send(json.dumps({
            'type': 'game_state',
            'game_id': game.game_id,
            'white_player': {
                'id': game.white_player.id,
                'username': game.white_player.username,
                'rating': game.white_rating_before
            },
            'black_player': {
                'id': game.black_player.id,
                'username': game.black_player.username,
                'rating': game.black_rating_before
            },
            'fen': game.current_fen,
            'status': game.status,
            'white_time': game.white_time_left,
            'black_time': game.black_time_left,
            'increment': game.increment * 1000,
            'moves': [
                {
                    'from': m.from_square,
                    'to': m.to_square,
                    'notation': m.algebraic_notation,
                    'color': m.color,
                    'piece': m.piece,
                    'captured': m.captured_piece,
                } for m in moves
            ],
            'current_turn': game.current_turn,
        }))
        
        # Start clock sync if game is ongoing
        if game.status == 'ongoing':
            self.clock_task = asyncio.create_task(self.clock_sync_loop())
    
class GameClockManager:
    """Singleton-style clock manager per game"""
    _instances = {}
    
    @classmethod
    def get_or_create(cls, game_id):
        if game_id not in cls._instances:
            cls._instances[game_id] = cls(game_id)
        return cls._instances[game_id]
    
    def __init__(self, game_id):
        self.game_id = game_id
        self.task = None
        self.last_tick = None
        self.subscribers = set()
    
    def subscribe(self, channel_name):
        self.subscribers.add(channel_name)
        if not self.task or self.task.done():
            self.task = asyncio.create_task(self._tick_loop())
    
    def unsubscribe(self, channel_name):
        self.subscribers.discard(channel_name)
        if not self.subscribers and self.task:
            self.task.cancel()
    
    async def _tick_loop(self):
        from channels.layers import get_channel_layer
        from .models import Game
        
        channel_layer = get_channel_layer()
        self.last_tick = datetime.now()
        
        try:
            while self.subscribers:
                await asyncio.sleep(1)
                
                # Get game from DB
                try:
                    game = await self._get_game()
                except:
                    break
                
                if game.status != 'ongoing':
                    break
                
                # Calculate elapsed
                now = datetime.now()
                elapsed_ms = int((now - self.last_tick).total_seconds() * 1000)
                self.last_tick = now
                
                # Deduct from current player
                if game.current_turn == 'white':
                    game.white_time_left = max(0, game.white_time_left - elapsed_ms)
                    time_out = game.white_time_left == 0
                else:
                    game.black_time_left = max(0, game.black_time_left - elapsed_ms)
                    time_out = game.black_time_left == 0
                
                await self._save_time(game)
                
                # Broadcast
                await channel_layer.group_send(
                    f'game_{self.game_id}',
                    {
                        'type': 'clock_tick',
                        'white_time': game.white_time_left,
                        'black_time': game.black_time_left,
                    }
                )
                
                if time_out:
                    await self._handle_timeout(game)
                    break
                    
        except asyncio.CancelledError:
            pass
    
    @database_sync_to_async
    def _get_game(self):
        from .models import Game
        return Game.objects.get(game_id=self.game_id)
    
    @database_sync_to_async
    def _save_time(self, game):
        game.save(update_fields=['white_time_left', 'black_time_left'])
    
    async def _handle_timeout(self, game):
        # Implementation same as before
        pass
    
    async def send_clock_sync(self):
        """Send immediate clock sync"""
        game = await self.get_game()
        if game:
            await self.send(json.dumps({
                'type': 'clock_sync',
                'white_time': game.white_time_left,
                'black_time': game.black_time_left,
            }))
    
async def make_move(self, payload):
    from .events import MoveMadeEvent
    from django.utils import timezone as tz
    
    game = await self.get_game()
    if not game or game.status != 'ongoing':
        await self.send(json.dumps({
            'type': 'error',
            'message': 'Invalid game state'
        }))
        return
    
    from_square = payload.get('from')
    to_square = payload.get('to')
    promotion = payload.get('promotion')
    
    # LOCK game for move validation
    lock_acquired = await self.acquire_move_lock(game.game_id)
    if not lock_acquired:
        await self.send(json.dumps({
            'type': 'error',
            'message': 'Move in progress, try again'
        }))
        return
    
    try:
        # Validate
        from game.chess_engine import ChessEngine
        engine = ChessEngine(game.current_fen)
        
        if not engine.is_valid_move(from_square, to_square, promotion):
            await self.send(json.dumps({
                'type': 'error',
                'message': 'Invalid move'
            }))
            return
        
        result = engine.make_move(from_square, to_square, promotion)
        
        # Add increment
        if game.current_turn == 'white':
            game.white_time_left += game.increment * 1000
        else:
            game.black_time_left += game.increment * 1000
        
        # Save move
        move = await self.save_move(game, from_square, to_square, result)
        await self.update_game(game, result['fen'], result.get('status'))
        
        # CREATE EVENT
        event = MoveMadeEvent(
            game_id=game.game_id,
            timestamp=tz.now(),
            sequence=game.move_count,
            payload=result,
            from_square=from_square,
            to_square=to_square,
            piece=result['piece'],
            captured=result.get('captured'),
            notation=result['notation'],
            fen_after=result['fen'],
            color='white' if game.current_turn == 'black' else 'black'
        )
        
        # BROADCAST EVENT
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'move_made_event',
                'event': {
                    'event_type': 'MoveMade',
                    'sequence': event.sequence,
                    'timestamp': event.timestamp.isoformat(),
                    'from': event.from_square,
                    'to': event.to_square,
                    'notation': event.notation,
                    'piece': event.piece,
                    'captured': event.captured,
                    'fen': event.fen_after,
                    'status': result.get('status', 'ongoing'),
                },
                'white_time': game.white_time_left,
                'black_time': game.black_time_left,
            }
        )
        
    finally:
        await self.release_move_lock(game.game_id)

# ADD lock methods
@database_sync_to_async
def acquire_move_lock(self, game_id):
    from django.core.cache import cache
    return cache.add(f'move_lock_{game_id}', 'locked', timeout=5)

@database_sync_to_async
def release_move_lock(self, game_id):
    from django.core.cache import cache
    cache.delete(f'move_lock_{game_id}')

# ADD event handler
async def move_made_event(self, event):
    await self.send(json.dumps({
        'type': 'move_made',
        'event': event['event'],
        'white_time': event['white_time'],
        'black_time': event['black_time'],
    }))
    
    async def handle_chat(self, payload):
        """Broadcast chat message to all players in game"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_broadcast',
                'message': {
                    'id': payload.get('timestamp', str(timezone.now().timestamp())),
                    'user': payload.get('user'),
                    'text': payload.get('text'),
                    'timestamp': payload.get('timestamp'),
                    'is_system': payload.get('is_system', False),
                }
            }
        )
    
    async def jump_to_move(self, payload):
        """Send state snapshot at specific move index"""
        move_index = payload.get('move_index', -1)
        game = await self.get_game()
        moves = await self.get_moves()
        
        if move_index < 0 or move_index >= len(moves):
            # Return current state
            await self.send(json.dumps({
                'type': 'state_snapshot',
                'fen': game.current_fen,
                'white_time': game.white_time_left,
                'black_time': game.black_time_left,
                'move_index': len(moves) - 1,
                'check': None,
                'last_move': None,
            }))
            return
        
        # Get FEN at that move
        target_move = moves[move_index]
        
        await self.send(json.dumps({
            'type': 'state_snapshot',
            'fen': target_move.fen_after,
            'white_time': target_move.time_left if target_move.color == 'white' else game.white_time_left,
            'black_time': target_move.time_left if target_move.color == 'black' else game.black_time_left,
            'move_index': move_index,
            'check': target_move.is_check,
            'last_move': {
                'from': target_move.from_square,
                'to': target_move.to_square,
            },
        }))
    
    async def resign(self):
        """Handle resignation"""
        game = await self.get_game()
        # TODO: Implement resign logic
        pass
    
    async def offer_draw(self):
        """Handle draw offer"""
        # TODO: Implement draw offer logic
        pass
    
    async def time_forfeit(self, color):
        """Handle time forfeit"""
        game = await self.get_game()
        winner = 'black' if color == 'white' else 'white'
        
        game.status = 'completed'
        game.winner = game.black_player if winner == 'black' else game.white_player
        game.result = '0-1' if winner == 'black' else '1-0'
        game.termination = 'time'
        game.ended_at = timezone.now()
        await self.save_game(game)
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_ended_broadcast',
                'status': 'completed',
                'winner': winner,
                'termination': 'time',
            }
        )
    
    # Message broadcast handlers
    async def game_move_broadcast(self, event):
        await self.send(json.dumps({
            'type': 'move_made',
            'move': event['move'],
            'fen': event['fen'],
            'white_time': event['white_time'],
            'black_time': event['black_time'],
        }))
    
    async def clock_sync_broadcast(self, event):
        await self.send(json.dumps({
            'type': 'clock_sync',
            'white_time': event['white_time'],
            'black_time': event['black_time'],
        }))
    
    async def chat_broadcast(self, event):
        await self.send(json.dumps({
            'type': 'chat_message',
            'message': event['message'],
        }))
    
    async def game_ended_broadcast(self, event):
        await self.send(json.dumps({
            'type': 'game_ended',
            'status': event['status'],
            'winner': event.get('winner'),
            'termination': event.get('termination'),
        }))
    
    # Database operations
    @database_sync_to_async
    def get_game(self):
        from .models import Game
        try:
            return Game.objects.select_related('white_player', 'black_player').get(game_id=self.game_id)
        except Game.DoesNotExist:
            return None
    
    @database_sync_to_async
    def get_moves(self):
        from .models import Move
        return list(Move.objects.filter(game_id=self.game_id).order_by('move_number', 'id'))
    
    @database_sync_to_async
    def save_move(self, game, from_sq, to_sq, result):
        from .models import Move
        move_num = (game.move_count // 2) + 1
        color = 'white' if game.move_count % 2 == 0 else 'black'
        time_left = game.white_time_left if color == 'white' else game.black_time_left
        
        return Move.objects.create(
            game=game,
            move_number=move_num,
            color=color,
            from_square=from_sq,
            to_square=to_sq,
            piece=result['piece'],
            captured_piece=result.get('captured', ''),
            promotion=result.get('promotion', ''),
            algebraic_notation=result['notation'],
            fen_after=result['fen'],
            is_check=result.get('is_check', False),
            is_checkmate=result.get('is_checkmate', False),
            time_spent=0,
            time_left=time_left,
        )
    
    @database_sync_to_async
    def update_game(self, game, fen, status):
        game.current_fen = fen
        game.move_count += 1
        game.current_turn = 'black' if game.current_turn == 'white' else 'white'
        if status and status != 'ongoing':
            game.status = status
            game.ended_at = timezone.now()
        game.save()
    
    @database_sync_to_async
    def save_game_time(self, game):
        game.save(update_fields=['white_time_left', 'black_time_left'])
    
    @database_sync_to_async
    def save_game(self, game):
        game.save()


class MatchmakingConsumer(AsyncWebsocketConsumer):
    """Matchmaking WebSocket consumer for pairing players"""
    
    async def connect(self):
        await self.accept()
        await self.send(json.dumps({
            'type': 'info',
            'message': 'Matchmaking service connected. Use friend challenges for now.'
        }))
    
    async def disconnect(self, close_code):
        pass
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')
        
        if action == 'join_queue':
            # TODO: Implement matchmaking queue logic
            await self.send(json.dumps({
                'type': 'queue_joined',
                'position': 1,
                'total_players': 1,
                'message': 'Matchmaking is under development. Please use friend challenges.'
            }))
        elif action == 'leave_queue':
            await self.send(json.dumps({
                'type': 'info',
                'message': 'Left matchmaking queue'
            }))