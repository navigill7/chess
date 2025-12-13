from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class GameEvent:
    event_type: str
    game_id: str
    timestamp: datetime
    sequence: int
    payload: dict

@dataclass
class MoveMadeEvent(GameEvent):
    event_type: str = 'MoveMade'
    from_square: str = ''
    to_square: str = ''
    piece: str = ''
    captured: Optional[str] = None
    notation: str = ''
    fen_after: str = ''
    color: str = ''