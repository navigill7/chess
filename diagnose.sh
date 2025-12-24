#!/bin/bash

# Chess Platform - Requirements Diagnostic Script
# Checks all prerequisites and dependencies

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Chess Platform - Requirements Diagnostic${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check Python
echo -e "${BLUE}[1/10] Checking Python...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
    PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)
    
    if [ "$PYTHON_MAJOR" -ge 3 ] && [ "$PYTHON_MINOR" -ge 10 ]; then
        echo -e "${GREEN}✓ Python $PYTHON_VERSION (OK)${NC}"
    else
        echo -e "${YELLOW}⚠ Python $PYTHON_VERSION (Recommended: 3.10+)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗ Python 3 not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check pip
echo -e "${BLUE}[2/10] Checking pip...${NC}"
if command -v pip3 &> /dev/null; then
    PIP_VERSION=$(pip3 --version | cut -d' ' -f2)
    echo -e "${GREEN}✓ pip $PIP_VERSION${NC}"
else
    echo -e "${RED}✗ pip not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check Node.js
echo -e "${BLUE}[3/10] Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js $NODE_VERSION${NC}"
else
    echo -e "${YELLOW}⚠ Node.js not found (Frontend will not work)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check npm
echo -e "${BLUE}[4/10] Checking npm...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm $NPM_VERSION${NC}"
else
    echo -e "${YELLOW}⚠ npm not found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check Redis
echo -e "${BLUE}[5/10] Checking Redis...${NC}"
if command -v redis-server &> /dev/null; then
    REDIS_VERSION=$(redis-server --version | cut -d'=' -f2 | cut -d' ' -f1)
    echo -e "${GREEN}✓ Redis $REDIS_VERSION (installed)${NC}"
    
    # Check if Redis is running
    if redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓ Redis is running${NC}"
    else
        echo -e "${YELLOW}⚠ Redis is not running (start with: redis-server --daemonize yes)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗ Redis not found${NC}"
    echo -e "  Install: Ubuntu/Debian: sudo apt-get install redis-server"
    echo -e "           macOS: brew install redis"
    ERRORS=$((ERRORS + 1))
fi

# Check PostgreSQL
echo -e "${BLUE}[6/10] Checking PostgreSQL...${NC}"
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | cut -d' ' -f3)
    echo -e "${GREEN}✓ PostgreSQL $PSQL_VERSION${NC}"
else
    echo -e "${YELLOW}⚠ PostgreSQL not found (SQLite will be used)${NC}"
    echo -e "  For production, install PostgreSQL:"
    echo -e "  Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo -e "  macOS: brew install postgresql"
    WARNINGS=$((WARNINGS + 1))
fi

# Check Git
echo -e "${BLUE}[7/10] Checking Git...${NC}"
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    echo -e "${GREEN}✓ Git $GIT_VERSION${NC}"
else
    echo -e "${YELLOW}⚠ Git not found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check project structure
echo -e "${BLUE}[8/10] Checking project structure...${NC}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

declare -a REQUIRED_DIRS=("server" "chess_bot" "frontend")
declare -a REQUIRED_FILES=(
    "server/manage.py"
    "server/requirements.txt"
    "chess_bot/manage.py"
    "chess_bot/requirements.txt"
    "frontend/package.json"
)

STRUCTURE_OK=true

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$PROJECT_ROOT/$dir" ]; then
        echo -e "${GREEN}  ✓ $dir/${NC}"
    else
        echo -e "${RED}  ✗ $dir/ not found${NC}"
        STRUCTURE_OK=false
        ERRORS=$((ERRORS + 1))
    fi
done

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$PROJECT_ROOT/$file" ]; then
        echo -e "${GREEN}  ✓ $file${NC}"
    else
        echo -e "${RED}  ✗ $file not found${NC}"
        STRUCTURE_OK=false
        ERRORS=$((ERRORS + 1))
    fi
done

# Check environment files
echo -e "${BLUE}[9/10] Checking environment configuration...${NC}"
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
    
    # Check critical variables
    if grep -q "SECRET_KEY=" "$PROJECT_ROOT/.env"; then
        echo -e "${GREEN}  ✓ SECRET_KEY configured${NC}"
    else
        echo -e "${YELLOW}  ⚠ SECRET_KEY not set${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    if grep -q "BOT_SECRET_KEY=" "$PROJECT_ROOT/.env"; then
        echo -e "${GREEN}  ✓ BOT_SECRET_KEY configured${NC}"
    else
        echo -e "${YELLOW}  ⚠ BOT_SECRET_KEY not set${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠ .env file not found (run setup.sh to create)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check Python dependencies
echo -e "${BLUE}[10/10] Checking Python virtual environments...${NC}"

if [ -d "$PROJECT_ROOT/server/venv" ]; then
    echo -e "${GREEN}✓ Server virtual environment exists${NC}"
else
    echo -e "${YELLOW}⚠ Server virtual environment not found (run setup.sh)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -d "$PROJECT_ROOT/chess_bot/venv" ]; then
    echo -e "${GREEN}✓ Bot virtual environment exists${NC}"
else
    echo -e "${YELLOW}⚠ Bot virtual environment not found (run setup.sh)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check frontend dependencies
if [ -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ Frontend dependencies not installed (run: cd frontend && npm install)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Diagnostic Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! System is ready.${NC}"
    echo ""
    echo -e "${GREEN}Next steps:${NC}"
    echo -e "  1. Start all services: ${YELLOW}./start_all.sh${NC}"
    echo -e "  2. Or run setup first: ${YELLOW}./setup.sh${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo -e "${YELLOW}System may work but some features might be limited${NC}"
    echo ""
    echo -e "${YELLOW}Recommended action:${NC}"
    echo -e "  Run setup script: ${YELLOW}./setup.sh${NC}"
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    fi
    echo ""
    echo -e "${RED}Required action:${NC}"
    echo -e "  1. Install missing dependencies (see errors above)"
    echo -e "  2. Run setup script: ${YELLOW}./setup.sh${NC}"
    exit 1
fi
