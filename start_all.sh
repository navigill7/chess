#!/bin/bash

# Chess Platform - Master Startup Script
# Runs: Main Server (Daphne) + Chess Bot (Django) + Celery Worker + Celery Beat

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$PROJECT_ROOT/server"
BOT_DIR="$PROJECT_ROOT/chess_bot"
LOG_DIR="$PROJECT_ROOT/logs"

# Ports
MAIN_SERVER_PORT=8000
BOT_SERVER_PORT=8001

# PID files
MAIN_SERVER_PID="$LOG_DIR/main_server.pid"
BOT_SERVER_PID="$LOG_DIR/bot_server.pid"
CELERY_WORKER_PID="$LOG_DIR/celery_worker.pid"
CELERY_BEAT_PID="$LOG_DIR/celery_beat.pid"

# Log files
MAIN_SERVER_LOG="$LOG_DIR/main_server.log"
BOT_SERVER_LOG="$LOG_DIR/bot_server.log"
CELERY_WORKER_LOG="$LOG_DIR/celery_worker.log"
CELERY_BEAT_LOG="$LOG_DIR/celery_beat.log"

# Create logs directory
mkdir -p "$LOG_DIR"

# Cleanup function
cleanup() {
    echo -e "${YELLOW}Shutting down all services...${NC}"
    
    # Kill all child processes
    if [ -f "$MAIN_SERVER_PID" ]; then
        kill $(cat "$MAIN_SERVER_PID") 2>/dev/null || true
        rm -f "$MAIN_SERVER_PID"
    fi
    
    if [ -f "$BOT_SERVER_PID" ]; then
        kill $(cat "$BOT_SERVER_PID") 2>/dev/null || true
        rm -f "$BOT_SERVER_PID"
    fi
    
    if [ -f "$CELERY_WORKER_PID" ]; then
        kill $(cat "$CELERY_WORKER_PID") 2>/dev/null || true
        rm -f "$CELERY_WORKER_PID"
    fi
    
    if [ -f "$CELERY_BEAT_PID" ]; then
        kill $(cat "$CELERY_BEAT_PID") 2>/dev/null || true
        rm -f "$CELERY_BEAT_PID"
    fi
    
    echo -e "${GREEN}All services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}Python 3 not found${NC}"
        exit 1
    fi
    
    # Check Redis
    if ! redis-cli ping &> /dev/null; then
        echo -e "${YELLOW}Redis not running. Starting Redis...${NC}"
        redis-server --daemonize yes
        sleep 2
    fi
    
    echo -e "${GREEN}Prerequisites OK${NC}"
}

# Run database migrations
run_migrations() {
    echo -e "${BLUE}Running database migrations...${NC}"
    
    # Main server migrations
    cd "$SERVER_DIR"
    python3 manage.py migrate --noinput
    
    # Bot server migrations
    cd "$BOT_DIR"
    python3 manage.py migrate --noinput
    
    echo -e "${GREEN}Migrations completed${NC}"
}

# Start main server (Daphne)
start_main_server() {
    echo -e "${BLUE}Starting main server (Daphne) on port $MAIN_SERVER_PORT...${NC}"
    
    cd "$SERVER_DIR"
    daphne -p $MAIN_SERVER_PORT core.asgi:application \
        > "$MAIN_SERVER_LOG" 2>&1 &
    
    echo $! > "$MAIN_SERVER_PID"
    echo -e "${GREEN}Main server started (PID: $(cat $MAIN_SERVER_PID))${NC}"
}

# Start chess bot server
start_bot_server() {
    echo -e "${BLUE}Starting chess bot server on port $BOT_SERVER_PORT...${NC}"
    
    cd "$BOT_DIR"
    python3 manage.py runserver 0.0.0.0:$BOT_SERVER_PORT \
        > "$BOT_SERVER_LOG" 2>&1 &
    
    echo $! > "$BOT_SERVER_PID"
    echo -e "${GREEN}Bot server started (PID: $(cat $BOT_SERVER_PID))${NC}"
}

# Start Celery worker
start_celery_worker() {
    echo -e "${BLUE}Starting Celery worker...${NC}"
    
    cd "$SERVER_DIR"
    celery -A core worker --loglevel=info \
        > "$CELERY_WORKER_LOG" 2>&1 &
    
    echo $! > "$CELERY_WORKER_PID"
    echo -e "${GREEN}Celery worker started (PID: $(cat $CELERY_WORKER_PID))${NC}"
}

# Start Celery beat
start_celery_beat() {
    echo -e "${BLUE}Starting Celery beat scheduler...${NC}"
    
    cd "$SERVER_DIR"
    celery -A core beat --loglevel=info \
        > "$CELERY_BEAT_LOG" 2>&1 &
    
    echo $! > "$CELERY_BEAT_PID"
    echo -e "${GREEN}Celery beat started (PID: $(cat $CELERY_BEAT_PID))${NC}"
}

# Monitor services
monitor_services() {
    echo -e "${GREEN}All services running!${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Main Server:${NC}    http://localhost:$MAIN_SERVER_PORT"
    echo -e "${GREEN}Bot Server:${NC}     http://localhost:$BOT_SERVER_PORT"
    echo -e "${GREEN}Admin Panel:${NC}    http://localhost:$MAIN_SERVER_PORT/admin"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Logs:${NC}"
    echo -e "  Main:   tail -f $MAIN_SERVER_LOG"
    echo -e "  Bot:    tail -f $BOT_SERVER_LOG"
    echo -e "  Celery: tail -f $CELERY_WORKER_LOG"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
    
    # Keep script running
    while true; do
        sleep 1
        
        # Check if services are still running
        for pid_file in "$MAIN_SERVER_PID" "$BOT_SERVER_PID" "$CELERY_WORKER_PID" "$CELERY_BEAT_PID"; do
            if [ -f "$pid_file" ]; then
                pid=$(cat "$pid_file")
                if ! kill -0 "$pid" 2>/dev/null; then
                    echo -e "${RED}Service with PID $pid died unexpectedly${NC}"
                    cleanup
                fi
            fi
        done
    done
}

# Main execution
main() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Chess Platform - Starting All Services${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    check_prerequisites
    run_migrations
    start_main_server
    sleep 2
    start_bot_server
    sleep 2
    start_celery_worker
    sleep 2
    start_celery_beat
    sleep 2
    monitor_services
}

main
