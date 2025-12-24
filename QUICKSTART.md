# Chess Platform - Quick Start Guide

## 5-Minute Setup

### Step 1: Run Diagnostic
```bash
./diagnose.sh
```
This checks all prerequisites and tells you what's missing.

### Step 2: Run Setup
```bash
./setup.sh
```
This installs all dependencies and configures the system.

### Step 3: Edit Configuration
```bash
nano .env
```
At minimum, change:
- `SECRET_KEY=` (generate a new random key)
- `BOT_SECRET_KEY=` (generate a new random key)

### Step 4: Start All Services
```bash
./start_all.sh
```

### Step 5: Start Frontend (Separate Terminal)
```bash
cd frontend
npm run dev
```

### Step 6: Open Browser
- Frontend: http://localhost:3000
- Admin: http://localhost:8000/admin (admin/admin123)

## Testing the Bot

### Via API (cURL)
```bash
# Get bot move
curl -X POST http://localhost:8001/api/bot/move/ \
  -H "Content-Type: application/json" \
  -d '{
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "time_ms": 2000
  }'

# Response:
# {
#   "success": true,
#   "move": "e2e4",
#   "evaluation": 25,
#   "nodes_searched": 15234,
#   "time_ms": 1998
# }
```


## Common Issues

### Redis Not Running
```bash
redis-server --daemonize yes
```

### Port Already in Use
```bash
# Kill process on port 8000
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Kill process on port 8001
lsof -i :8001 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Database Migration Errors
```bash
# Reset and re-run migrations
cd server
source venv/bin/activate
python manage.py flush
python manage.py migrate

cd ../chess_bot
source venv/bin/activate
python manage.py migrate
```

### Bot Not Responding
```bash
# Check bot logs
tail -f logs/bot_server.log

# Restart bot server
pkill -f "chess_bot"
cd chess_bot
source venv/bin/activate
python manage.py runserver 8001
```

## Service Status

### Check if Services are Running
```bash
# Main server
curl http://localhost:8000/api/game/health/

# Bot server
curl http://localhost:8001/api/bot/health/

# Redis
redis-cli ping
```

### View Logs
```bash
# Real-time log monitoring
tail -f logs/*.log

# Specific service
tail -f logs/bot_server.log
```

## What Each Service Does

### Main Server (Port 8000)
- User authentication
- P2P game management
- WebSocket for real-time play
- Matchmaking system
- Game history

### Chess Bot (Port 8001)
- AI move generation
- Position evaluation
- Move validation
- No database needed (stateless)

### Celery Worker
- Background matchmaking tasks
- Async game cleanup
- Rating calculations

### Celery Beat
- Scheduled cleanup jobs
- Runs every 5 minutes

### Redis
- WebSocket message broker
- Celery task queue
- Session cache

## 🐛 Debug Mode

### Enable Verbose Logging
Edit `.env`:
```env
DEBUG=True
BOT_DEBUG=True
```

### Run Services Manually (for debugging)
```bash
# Terminal 1: Main server with output
cd server && source venv/bin/activate && daphne -p 8000 core.asgi:application

# Terminal 2: Bot server with output
cd chess_bot && source venv/bin/activate && python manage.py runserver 8001

# Terminal 3: Celery worker
cd server && source venv/bin/activate && celery -A core worker -l debug

# Terminal 4: Frontend
cd frontend && npm run dev
```

## Getting Help

1. Run diagnostics: `./diagnose.sh`
2. Check logs: `tail -f logs/*.log`
3. Test endpoints: `curl http://localhost:8001/api/bot/health/`
4. Check Redis: `redis-cli ping`
5. Verify databases: Check that migrations ran successfully