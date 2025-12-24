/**
 * Chess Bot API Service
 * Handles all communication with the chess bot microservice
 */

const BOT_API_URL = import.meta.env.VITE_BOT_API_URL || 'http://localhost:8001';

class BotService {
  /**
   * Get bot move with time-based search
   * @param {string} fen - Board position in FEN
   * @param {number} timeMs - Thinking time in milliseconds
   * @returns {Promise<{success: boolean, move: string, evaluation: number, nodes_searched: number}>}
   */
  async getBotMove(fen, timeMs) {
    try {
      const response = await fetch(`${BOT_API_URL}/api/bot/move/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fen: fen,
          time_ms: timeMs
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Bot move request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Bot move error:', error);
      throw error;
    }
  }

  /**
   * Validate if a move is legal
   * @param {string} fen - Board position
   * @param {string} move - Move in UCI format
   * @returns {Promise<{success: boolean, legal: boolean, new_fen: string, legal_moves: string[]}>}
   */
  async validateMove(fen, move) {
    try {
      const response = await fetch(`${BOT_API_URL}/api/bot/validate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fen, move })
      });

      if (!response.ok) {
        throw new Error('Move validation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Move validation error:', error);
      throw error;
    }
  }

  /**
   * Check bot service health
   * @returns {Promise<{status: string, service: string}>}
   */
  async healthCheck() {
    try {
      const response = await fetch(`${BOT_API_URL}/api/bot/health/`);
      return await response.json();
    } catch (error) {
      console.error('Bot health check failed:', error);
      return { status: 'unavailable', service: 'chess-bot' };
    }
  }

  /**
   * Calculate thinking time based on difficulty
   * @param {string} difficulty - 'easy', 'medium', 'hard', or 'expert'
   * @returns {number} Time in milliseconds
   */
  getThinkingTimeForDifficulty(difficulty) {
    const timeMap = {
      'easy': 500,      // 0.5 seconds - depth ~2-3
      'medium': 2000,   // 2 seconds   - depth ~4-5
      'hard': 5000,     // 5 seconds   - depth ~6-8
      'expert': 10000   // 10 seconds  - depth ~9-12
    };
    return timeMap[difficulty] || 2000;
  }

  /**
   * Get difficulty label and description
   * @param {string} difficulty
   * @returns {{label: string, time: string, icon: string, description: string}}
   */
  getDifficultyInfo(difficulty) {
    const info = {
      'easy': {
        label: 'Easy',
        time: '0.5s',
        icon: '😊',
        description: 'Great for beginners'
      },
      'medium': {
        label: 'Medium',
        time: '2s',
        icon: '🤔',
        description: 'Good challenge for intermediate players'
      },
      'hard': {
        label: 'Hard',
        time: '5s',
        icon: '😈',
        description: 'Challenging for advanced players'
      },
      'expert': {
        label: 'Expert',
        time: '10s',
        icon: '🔥',
        description: 'Maximum difficulty'
      }
    };
    return info[difficulty] || info['medium'];
  }

  /**
   * Create a new bot game session
   * @param {string} difficulty
   * @param {string} playerColor - 'white' or 'black'
   * @returns {{gameId: string, difficulty: string, playerColor: string, fen: string}}
   */
  createBotGame(difficulty, playerColor) {
    const gameId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    
    return {
      gameId,
      difficulty,
      playerColor,
      fen: startFen,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get AI evaluation explanation
   * @param {number} evaluation - Centipawn evaluation
   * @returns {string}
   */
  getEvaluationDescription(evaluation) {
    const abs = Math.abs(evaluation);
    
    if (abs < 50) return 'Equal position';
    if (abs < 150) return 'Slight advantage';
    if (abs < 300) return 'Clear advantage';
    if (abs < 500) return 'Winning advantage';
    if (abs < 1000) return 'Decisive advantage';
    return 'Completely winning';
  }
}

export default new BotService();