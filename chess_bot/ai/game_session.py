"""
Game Session Manager - handles unique game IDs and multiple concurrent games.
No database storage, just in-memory session management.
"""

import uuid
import time
from threading import Lock
from typing import Dict, Optional


class GameSession:
    """Represents a single chess game session"""
    
    def __init__(self, game_id: str):
        self.game_id = game_id
        self.fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        self.moves = []  # List of UCI moves
        self.created_at = time.time()
        self.last_accessed = time.time()
        self.player_color = 'white'  # Player plays as white by default
        self.difficulty = 'medium'   # easy, medium, hard
    
    def update_position(self, fen: str, move: str = None):
        """Update position after a move"""
        self.fen = fen
        if move:
            self.moves.append(move)
        self.last_accessed = time.time()
    
    def is_expired(self, timeout: int = 3600) -> bool:
        """Check if session expired (default 1 hour)"""
        return time.time() - self.last_accessed > timeout


class GameSessionManager:
    """Manages multiple game sessions"""
    
    def __init__(self):
        self.sessions: Dict[str, GameSession] = {}
        self.lock = Lock()
        self.cleanup_interval = 300  # Cleanup every 5 minutes
        self.last_cleanup = time.time()
    
    def create_game(self, player_color: str = 'white', difficulty: str = 'medium') -> str:
        """
        Create a new game session.
        Returns: game_id (UUID)
        """
        game_id = str(uuid.uuid4())
        
        with self.lock:
            session = GameSession(game_id)
            session.player_color = player_color
            session.difficulty = difficulty
            self.sessions[game_id] = session
            
            # Cleanup old sessions
            self._cleanup_expired_sessions()
        
        return game_id
    
    def get_game(self, game_id: str) -> Optional[GameSession]:
        """Get game session by ID"""
        with self.lock:
            session = self.sessions.get(game_id)
            if session and not session.is_expired():
                session.last_accessed = time.time()
                return session
            elif session:
                # Remove expired session
                del self.sessions[game_id]
            return None
    
    def update_game(self, game_id: str, fen: str, move: str = None) -> bool:
        """Update game position"""
        with self.lock:
            session = self.sessions.get(game_id)
            if session:
                session.update_position(fen, move)
                return True
            return False
    
    def delete_game(self, game_id: str) -> bool:
        """Delete a game session"""
        with self.lock:
            if game_id in self.sessions:
                del self.sessions[game_id]
                return True
            return False
    
    def get_game_count(self) -> int:
        """Get number of active games"""
        with self.lock:
            return len(self.sessions)
    
    def _cleanup_expired_sessions(self):
        """Remove expired sessions"""
        current_time = time.time()
        
        # Only cleanup periodically
        if current_time - self.last_cleanup < self.cleanup_interval:
            return
        
        expired = [
            game_id for game_id, session in self.sessions.items()
            if session.is_expired()
        ]
        
        for game_id in expired:
            del self.sessions[game_id]
        
        self.last_cleanup = current_time
        
        if expired:
            print(f"Cleaned up {len(expired)} expired game sessions")


# Global session manager instance
game_manager = GameSessionManager()