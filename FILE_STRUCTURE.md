# Complete File Structure

## Configuration & Setup Files (Root)
```
chess-platform/
├── .env                      # Environment variables (create from .env.template)
├── .env.template            # Environment template with all options
├── README.md                # Complete documentation
├── QUICKSTART.md           # 5-minute setup guide
├── setup.sh                # Installation script (auto-setup)
├── start_all.sh            # Master startup script (one command)
├── diagnose.sh             # Requirements diagnostic tool
├── docker-compose.yml      # Docker deployment config
└── logs/                   # Service logs (auto-created)
    ├── main_server.log
    ├── bot_server.log
    ├── celery_worker.log
    └── celery_beat.log
```

## Main Server (Django + Daphne + WebSocket)
```
server/
├── manage.py
├── requirements.txt        # Python dependencies
├── Dockerfile             # Docker build file
├── venv/                  # Virtual environment (auto-created)
├── db.sqlite3            # SQLite database (or PostgreSQL)
│
├── core/                  # Django project settings
│   ├── __init__.py       # Celery app initialization
│   ├── settings.py       # Main configuration
│   ├── urls.py           # URL routing
│   ├── asgi.py           # ASGI application
│   ├── wsgi.py           # WSGI application
│   ├── celery.py         # Celery configuration
│   └── jwt_auth_middleware.py  # WebSocket auth
│
├── accounts/              # User management
│   ├── models.py         # User model
│   ├── views.py          # Auth endpoints
│   ├── urls.py
│   ├── serializers.py
│   └── migrations/
│
└── game/                  # P2P game logic
    ├── models.py         # Game, MatchmakingQueue models
    ├── views.py          # REST API endpoints
    ├── urls.py
    ├── consumers.py      # WebSocket consumers
    ├── routing.py        # WebSocket routing
    ├── tasks.py          # Celery tasks
    ├── serializers.py
    └── migrations/
```

## Chess Bot Microservice (Django)
```
chess_bot/
├── manage.py
├── requirements.txt       # Bot dependencies
├── Dockerfile            # Docker build file
├── venv/                 # Virtual environment (auto-created)
├── db.sqlite3           # SQLite database
│
├── bot/                  # Django project settings
│   ├── settings.py      # Bot configuration
│   ├── urls.py          # URL routing
│   ├── asgi.py
│   └── wsgi.py
│
└── ai/                   # Chess engine
    ├── apps.py
    ├── urls.py          # API endpoints
    ├── views.py         # Move generation API
    ├── admin.py
    ├── models.py
    ├── tests.py
    └── engine/          # Core chess engine
        ├── __init__.py
        ├── board.py              # Board representation
        ├── move.py               # Move structure
        ├── move_generator.py     # Legal move generation
        ├── move_ordering.py      # Search optimization
        ├── piece.py              # Piece definitions
        ├── evaluation.py         # Position evaluation
        ├── search.py             # Alpha-beta search
        ├── transposition_table.py # Search cache
        ├── repetition_table.py   # Draw detection
        ├── zobrist.py            # Position hashing
        └── bot.py                # Main bot interface
```

## Frontend (React + Vite)
```
frontend/
├── package.json
├── vite.config.js
├── index.html
├── .env                   # Frontend config (auto-created)
├── Dockerfile            # Docker build file
├── node_modules/         # Dependencies (auto-created)
│
└── src/
    ├── main.jsx          # Entry point
    ├── App.jsx           # Main app component
    │
    ├── pages/            # Route pages
    │   ├── Home.jsx              # Landing/dashboard
    │   ├── BotGame.jsx           # Play vs Computer
    │   ├── Game.jsx              # P2P multiplayer
    │   ├── Matchmaking.jsx       # Queue system
    │   └── [other pages]
    │
    ├── components/       # Reusable components
    │   └── chess/
    │       ├── ChessBoard.jsx        # Main board display
    │       ├── GameClock.jsx         # Timer
    │       ├── MoveHistory.jsx       # Move list
    │       ├── CapturedPieces.jsx    # Captured pieces
    │       ├── PromotionModal.jsx    # Pawn promotion
    │       ├── GameControls.jsx      # Resign/draw/etc
    │       ├── ChatBox.jsx           # In-game chat
    │       └── RatingChangeDisplay.jsx
    │
    ├── chess/            # Chess logic (client-side)
    │   ├── Board.js              # FEN parser
    │   └── MoveValidator.js      # Legal moves
    │
    ├── hooks/            # React hooks
    │   └── useChessGame.js       # Game state management
    │
    ├── services/         # API clients
    │   ├── botService.js         # Bot API
    │   ├── gameService.js        # P2P game API
    │   └── authService.js        # Authentication
    │
    └── styles/           # CSS files
        └── Board.css
```

✅ **New Scripts:**
- `/home/claude/setup.sh` (Installation)
- `/home/claude/start_all.sh` (Master startup)
- `/home/claude/diagnose.sh` (Diagnostic)


**Run setup:**
   ```bash
   cd /your/project/directory
   ./diagnose.sh    # Check requirements
   ./setup.sh       # Install everything
   ```

**Start services:**
   ```bash
   ./start_all.sh   # Starts all backend services
   # In another terminal:
   cd frontend && npm run dev
   ```

**Test bot:**
   - Visit http://localhost:3000
   - Click "Play Against Computer"
   - Select difficulty and play!