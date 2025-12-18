from django.contrib import admin
from .models import Game, Move, GameChallenge, MatchmakingQueue


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    """Game admin"""
    list_display = ['game_id', 'white_player', 'black_player', 'status', 'result', 'time_control', 'created_at']
    list_filter = ['status', 'result', 'time_control', 'created_at']
    search_fields = ['game_id', 'white_player__username', 'black_player__username']
    date_hierarchy = 'created_at'
    readonly_fields = ['game_id', 'created_at', 'started_at', 'ended_at']
    
    fieldsets = (
        ('Game Info', {'fields': ('game_id', 'status', 'result', 'winner', 'termination')}),
        ('Players', {'fields': ('white_player', 'black_player')}),
        ('Time Control', {'fields': ('time_control', 'initial_time', 'increment', 'white_time_left', 'black_time_left')}),
        ('Position', {'fields': ('current_fen', 'initial_fen', 'move_count', 'current_turn')}),
        ('Ratings', {'fields': ('white_rating_before', 'black_rating_before', 'white_rating_after', 'black_rating_after')}),
        ('Timestamps', {'fields': ('created_at', 'started_at', 'ended_at')}),
    )


@admin.register(Move)
class MoveAdmin(admin.ModelAdmin):
    """Move admin"""
    list_display = ['game', 'move_number', 'color', 'algebraic_notation', 'piece', 'is_check', 'is_checkmate']
    list_filter = ['color', 'is_check', 'is_checkmate', 'piece']
    search_fields = ['game__game_id', 'algebraic_notation']
    readonly_fields = ['created_at']


@admin.register(GameChallenge)
class GameChallengeAdmin(admin.ModelAdmin):
    """Game Challenge admin"""
    list_display = ['challenger', 'challenged', 'status', 'time_control', 'created_at', 'expires_at']
    list_filter = ['status', 'time_control', 'created_at']
    search_fields = ['challenger__username', 'challenged__username']
    date_hierarchy = 'created_at'


@admin.register(MatchmakingQueue)
class MatchmakingQueueAdmin(admin.ModelAdmin):
    """Matchmaking Queue admin"""
    list_display = ['user', 'time_control', 'rating', 'joined_at']
    list_filter = ['time_control', 'joined_at']
    search_fields = ['user__username']
    date_hierarchy = 'joined_at'