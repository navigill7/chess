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

        # Subscribe to clock
        self.clock_manager = GameClockManager.get_or_create(self.game_id)
        self.clock_manager.subscribe(self.channel_name)
        
        await self.accept()
    
    async def disconnect(self, close_code):
        if hasattr(self, 'clock_manager'):
            self.clock_manager.unsubscribe(self.channel_name)
        
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def clock_tick(self, event):
        """Handle clock tick from clock manager"""
        await self.send(json.dumps({
            'type': 'clock_sync',
            'white_time': event['white_time'],
            'black_time': event['black_time'],
        }))

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
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
        elif msg_type == 'resign':
            await self.resign()
        elif msg_type == 'offer_draw':
            await self.offer_draw()
    
    async def join_game(self):
        """Initialize game state for new connection"""
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
    
    async def make_move(self, payload):
        """Handle move from player - FIXED TO PREVENT RECURSION"""
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
        
        # Acquire lock
        lock_acquired = await self.acquire_move_lock(game.game_id)
        if not lock_acquired:
            await self.send(json.dumps({
                'type': 'error',
                'message': 'Move in progress, please wait'
            }))
            return
        
        try:
            # CRITICAL FIX: Capture color BEFORE state changes
            moving_color = game.current_turn
            
            # Validate move
            from .chess_engine import ChessEngine
            engine = ChessEngine(game.current_fen)
            
            if not engine.is_valid_move(from_square, to_square, promotion):
                await self.send(json.dumps({
                    'type': 'error',
                    'message': 'Invalid move'
                }))
                return
            
            # Execute move in engine
            result = engine.make_move(from_square, to_square, promotion)
            
            # Add time increment to player who just moved
            if moving_color == 'white':
                game.white_time_left += game.increment * 1000
            else:
                game.black_time_left += game.increment * 1000
            
            # Save move and update game
            move = await self.save_move(game, from_square, to_square, result, moving_color)
            await self.update_game_state(
                game.game_id, 
                result['fen'], 
                result.get('status'),
                game.white_time_left,
                game.black_time_left
            )
            
            # FIXED: Get fresh game state once
            game = await self.get_game()
            
            # Broadcast to all clients - CRITICAL: Use send_group_message to avoid recursion
            await self.send_group_message(
                self.room_group_name,
                {
                    'type': 'game_move_broadcast',  # Changed type name to avoid conflicts
                    'move': {
                        'from': from_square,
                        'to': to_square,
                        'notation': result['notation'],
                        'piece': result['piece'],
                        'captured': result.get('captured'),
                        'fen': result['fen'],
                        'status': result.get('status', 'ongoing'),
                        'winner': result.get('winner'),
                        'is_check': result.get('is_check', False),
                        'color': moving_color,
                        'timestamp': timezone.now().isoformat(),
                        'sequence': game.move_count - 1,
                    },
                    'white_time': game.white_time_left,
                    'black_time': game.black_time_left,
                }
            )
            
        except Exception as e:
            print(f"❌ Move error: {e}")
            import traceback
            traceback.print_exc()
            await self.send(json.dumps({
                'type': 'error',
                'message': f'Move failed: {str(e)}'
            }))
        finally:
            await self.release_move_lock(game.game_id)

    async def handle_chat(self, payload):
        """Broadcast chat message"""
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
        """Send state snapshot at specific move"""
        move_index = payload.get('move_index', -1)
        game = await self.get_game()
        moves = await self.get_moves()
        
        if move_index < 0 or move_index >= len(moves):
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
        game = await self.get_game()
        
        if not game or game.status != 'ongoing':
            await self.send(json.dumps({
                'type': 'error',
                'message': 'Game is not ongoing'
            }))
            return
        
        # Determine who resigned and who won
        resigning_user = self.scope['user']
        
        if game.white_player.id == resigning_user.id:
            winner = game.black_player
            winner_color = 'black'
            result = '0-1'
        elif game.black_player.id == resigning_user.id:
            winner = game.white_player
            winner_color = 'white'
            result = '1-0'
        else:
            await self.send(json.dumps({
                'type': 'error',
                'message': 'You are not a player in this game'
            }))
            return
        
        # Update game status
        await self.end_game(
            game.game_id,
            status='completed',
            result=result,
            winner=winner,
            termination='resignation'
        )
        
        # Broadcast to all players
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_ended_broadcast',
                'status': 'completed',
                'winner': winner_color,
                'termination': 'resignation',
                'result': result,
                'message': f'{resigning_user.username} resigned'
            }
        )

    
    async def offer_draw(self):
        game = await self.get_game()
        
        if not game or game.status != 'ongoing':
            await self.send(json.dumps({
                'type': 'error',
                'message': 'Game is not ongoing'
            }))
            return
        
        offering_user = self.scope['user']
        
        # Determine who made the offer
        if game.white_player.id == offering_user.id:
            offer_from = 'white'
        elif game.black_player.id == offering_user.id:
            offer_from = 'black'
        else:
            await self.send(json.dumps({
                'type': 'error',
                'message': 'You are not a player in this game'
            }))
            return
        
        # Broadcast draw offer to all players
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'draw_offer_broadcast',
                'offer_from': offer_from,
                'username': offering_user.username,
            }
        )

    async def accept_draw(self):
        game = await self.get_game()
        
        if not game or game.status != 'ongoing':
            await self.send(json.dumps({
                'type': 'error',
                'message': 'Game is not ongoing'
            }))
            return
        
        # Update game to draw
        await self.end_game(
            game.game_id,
            status='completed',
            result='1/2-1/2',
            winner=None,
            termination='agreement'
        )
        
        # Broadcast game ended
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_ended_broadcast',
                'status': 'completed',
                'winner': None,
                'termination': 'agreement',
                'result': '1/2-1/2',
                'message': 'Draw by agreement'
            }
        )

    async def decline_draw(self):
        """Decline draw offer - NEW FUNCTION"""
        # Broadcast draw declined
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'draw_declined_broadcast',
                'message': 'Draw offer declined'
            }
        )
    
    # Event handlers
    async def draw_offer_broadcast(self, event):
        """Send draw offer to client"""
        await self.send(json.dumps({
            'type': 'draw_offer',
            'offer_from': event['offer_from'],
            'username': event['username'],
        }))
    
    async def draw_declined_broadcast(self, event):
        """Send draw declined to client"""
        await self.send(json.dumps({
            'type': 'draw_declined',
            'message': event['message'],
        }))
    
    # FIXED: Event handlers with unique names to avoid recursion
    async def game_move_broadcast(self, event):
        """Send move to client - FIXED to prevent recursion"""
        await self.send(json.dumps({
            'type': 'move_made',
            'move': event['move'],
            'white_time': event['white_time'],
            'black_time': event['black_time'],
        }))
    
    async def chat_broadcast(self, event):
        """Send chat message to client"""
        await self.send(json.dumps({
            'type': 'chat_message',
            'message': event['message'],
        }))
    
    async def game_ended_broadcast(self, event):
        """Send game end notification"""
        await self.send(json.dumps({
            'type': 'game_ended',
            'status': event['status'],
            'winner': event.get('winner'),
            'termination': event.get('termination'),
        }))
    
    # Helper to send group messages
    async def send_group_message(self, group_name, message):
        """Send message to group via channel layer"""
        await self.channel_layer.group_send(group_name, message)
    
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
    def save_move(self, game, from_sq, to_sq, result, color):
        from .models import Move
        move_num = (game.move_count // 2) + 1
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
    def update_game_state(self, game_id, fen, status, white_time, black_time):
        """FIXED: Update game in single atomic operation"""
        from .models import Game
        
        game = Game.objects.get(game_id=game_id)
        game.current_fen = fen
        game.move_count += 1
        game.current_turn = 'black' if game.current_turn == 'white' else 'white'
        game.white_time_left = white_time
        game.black_time_left = black_time
        
        if status and status != 'ongoing':
            game.status = status
            game.ended_at = timezone.now()
        
        game.save()
    
    @database_sync_to_async
    def acquire_move_lock(self, game_id):
        from django.core.cache import cache
        return cache.add(f'move_lock_{game_id}', 'locked', timeout=5)

    @database_sync_to_async
    def release_move_lock(self, game_id):
        from django.core.cache import cache
        cache.delete(f'move_lock_{game_id}')

    @database_sync_to_async
    def end_game(self, game_id, status, result, winner, termination):
        """End the game with given parameters"""
        from .models import Game
        
        game = Game.objects.get(game_id=game_id)
        game.status = status
        game.result = result
        game.winner = winner
        game.termination = termination
        game.ended_at = timezone.now()
        
        # Calculate rating changes if needed
        if result != '1/2-1/2':
            white_rating_change, black_rating_change = self._calculate_rating_changes(
                game.white_rating_before,
                game.black_rating_before,
                result
            )
            
            game.white_rating_after = game.white_rating_before + white_rating_change
            game.black_rating_after = game.black_rating_before + black_rating_change
            
            # Update player ratings
            game.white_player.rating = game.white_rating_after
            game.black_player.rating = game.black_rating_after
            
            # Update statistics
            if result == '1-0':
                game.white_player.games_won += 1
                game.black_player.games_lost += 1
            else:
                game.black_player.games_won += 1
                game.white_player.games_lost += 1
            
            game.white_player.games_played += 1
            game.black_player.games_played += 1
            
            game.white_player.save()
            game.black_player.save()
        else:
            # Draw
            game.white_rating_after = game.white_rating_before
            game.black_rating_after = game.black_rating_before
            
            game.white_player.games_drawn += 1
            game.black_player.games_drawn += 1
            game.white_player.games_played += 1
            game.black_player.games_played += 1
            
            game.white_player.save()
            game.black_player.save()
        
        game.save()

    def _calculate_rating_changes(self, white_rating, black_rating, result):
        """Calculate ELO rating changes"""
        K = 32  # K-factor
        
        # Expected scores
        expected_white = 1 / (1 + 10 ** ((black_rating - white_rating) / 400))
        expected_black = 1 - expected_white
        
        # Actual scores
        if result == '1-0':
            actual_white, actual_black = 1, 0
        else:  # '0-1'
            actual_white, actual_black = 0, 1
        
        # Rating changes
        white_change = round(K * (actual_white - expected_white))
        black_change = round(K * (actual_black - expected_black))
        
        return white_change, black_change


class GameClockManager:
    """Singleton clock manager per game"""
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
                
                try:
                    game = await self._get_game()
                except:
                    break
                
                if game.status != 'ongoing':
                    break
                
                now = datetime.now()
                elapsed_ms = int((now - self.last_tick).total_seconds() * 1000)
                self.last_tick = now
                
                if game.current_turn == 'white':
                    game.white_time_left = max(0, game.white_time_left - elapsed_ms)
                    time_out = game.white_time_left == 0
                else:
                    game.black_time_left = max(0, game.black_time_left - elapsed_ms)
                    time_out = game.black_time_left == 0
                
                await self._save_time(game)
                
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
        """Handle timeout - IMPLEMENTED"""
        from channels.layers import get_channel_layer
        
        channel_layer = get_channel_layer()
        
        # Determine winner based on who ran out of time
        if game.white_time_left == 0:
            winner = game.black_player
            winner_color = 'black'
            result = '0-1'
        else:
            winner = game.white_player
            winner_color = 'white'
            result = '1-0'
        
        # Update game in database
        await self._end_game_on_timeout(game.game_id, result, winner)
        
        # Broadcast game ended
        await channel_layer.group_send(
            f'game_{self.game_id}',
            {
                'type': 'game_ended_broadcast',
                'status': 'completed',
                'winner': winner_color,
                'termination': 'timeout',
                'result': result,
                'message': f'{winner.username} won on time'
            }
        )
    
    @database_sync_to_async
    def _end_game_on_timeout(self, game_id, result, winner):
        """End game due to timeout"""
        from .models import Game
        
        game = Game.objects.get(game_id=game_id)
        game.status = 'completed'
        game.result = result
        game.winner = winner
        game.termination = 'timeout'
        game.ended_at = timezone.now()
        
        # Calculate rating changes
        white_rating_change, black_rating_change = self._calculate_rating_changes_sync(
            game.white_rating_before,
            game.black_rating_before,
            result
        )
        
        game.white_rating_after = game.white_rating_before + white_rating_change
        game.black_rating_after = game.black_rating_before + black_rating_change
        
        # Update player ratings and statistics
        game.white_player.rating = game.white_rating_after
        game.black_player.rating = game.black_rating_after
        
        if result == '1-0':
            game.white_player.games_won += 1
            game.black_player.games_lost += 1
        else:
            game.black_player.games_won += 1
            game.white_player.games_lost += 1
        
        game.white_player.games_played += 1
        game.black_player.games_played += 1
        
        game.white_player.save()
        game.black_player.save()
        game.save()
    
    def _calculate_rating_changes_sync(self, white_rating, black_rating, result):
        """Calculate ELO rating changes (sync version)"""
        K = 32
        
        expected_white = 1 / (1 + 10 ** ((black_rating - white_rating) / 400))
        expected_black = 1 - expected_white
        
        if result == '1-0':
            actual_white, actual_black = 1, 0
        else:
            actual_white, actual_black = 0, 1
        
        white_change = round(K * (actual_white - expected_white))
        black_change = round(K * (actual_black - expected_black))
        
        return white_change, black_change


class MatchmakingConsumer(AsyncWebsocketConsumer):
    """Matchmaking WebSocket"""
    
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