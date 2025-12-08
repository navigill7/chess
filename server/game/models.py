from django.db import models
from django.utils import timezone
from accounts.models import User
import uuid

class Game(models.Model):
    STATUS_CHOICES = [
        ('waiting', 'Waiting'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('abandoned', 'Abandoned'),
    ]
    
    RESULT_CHOICES = [
        ('1-0', 'White Wins'),
        ('0-1', 'Black Wins'),
        ('1/2-1/2', 'Draw'),
        ('*', 'Ongoing'),
    ]
    
    game_id = models.CharField(max_length=50, unique=True, primary_key=True)
    white_player = models.ForeignKey(User, on_delete=models.CASCADE, related_name='games_as_white')
    black_player = models.ForeignKey(User, on_delete=models.CASCADE, related_name='games_as_black')
    
    time_control = models.CharField(max_length=10)  # e.g., "5+0", "10+5"
    initial_time = models.IntegerField()  # in seconds
    increment = models.IntegerField()  # in seconds
    
    white_time_left = models.IntegerField()  # in milliseconds
    black_time_left = models.IntegerField()  # in milliseconds
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')
    result = models.CharField(max_length=10, choices=RESULT_CHOICES, default='*')
    winner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='won_games')
    termination = models.CharField(max_length=50, blank=True)  # checkmate, resignation, timeout, etc.
    
    current_fen = models.TextField(default='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    initial_fen = models.TextField(default='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    pgn = models.TextField(blank=True)
    
    move_count = models.IntegerField(default=0)
    current_turn = models.CharField(max_length=5, default='white')
    
    created_at = models.DateTimeField(default=timezone.now)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    white_rating_before = models.IntegerField(default=1200)
    black_rating_before = models.IntegerField(default=1200)
    white_rating_after = models.IntegerField(null=True, blank=True)
    black_rating_after = models.IntegerField(null=True, blank=True)
    
    spectator_count = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'games'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.game_id} - {self.white_player.username} vs {self.black_player.username}"
    
    @classmethod
    def generate_game_id(cls):
        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        random_str = uuid.uuid4().hex[:8]
        return f"{timestamp}_{random_str}"
    
    def get_duration(self):
        if self.started_at and self.ended_at:
            return (self.ended_at - self.started_at).total_seconds()
        return 0


class Move(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='moves')
    move_number = models.IntegerField()
    color = models.CharField(max_length=5)  # 'white' or 'black'
    
    from_square = models.CharField(max_length=2)  # e.g., 'e2'
    to_square = models.CharField(max_length=2)  # e.g., 'e4'
    
    piece = models.CharField(max_length=10)  # 'pawn', 'knight', etc.
    captured_piece = models.CharField(max_length=10, blank=True)
    promotion = models.CharField(max_length=10, blank=True)
    
    is_check = models.BooleanField(default=False)
    is_checkmate = models.BooleanField(default=False)
    is_castling = models.BooleanField(default=False)
    is_en_passant = models.BooleanField(default=False)
    
    algebraic_notation = models.CharField(max_length=10)  # e.g., 'Nf3', 'e4', 'O-O'
    fen_after = models.TextField()
    
    time_spent = models.IntegerField()  # milliseconds spent on this move
    time_left = models.IntegerField()  # milliseconds left after move
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'moves'
        ordering = ['move_number', 'id']
        unique_together = ['game', 'move_number', 'color']
        
    def __str__(self):
        return f"{self.game.game_id} - Move {self.move_number}: {self.algebraic_notation}"


class MatchmakingQueue(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    time_control = models.CharField(max_length=10)
    rating = models.IntegerField()
    joined_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'matchmaking_queue'
        ordering = ['joined_at']
        
    def __str__(self):
        return f"{self.user.username} - {self.time_control}"