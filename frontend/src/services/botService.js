const BOT_API_URL = import.meta.env.VITE_BOT_API_URL || 'http://localhost:8001';

class BotService {
  /**
   * Get bot move with time-based search
   * @param {string} fen - Board position in FEN
   * @param {number} timeMs - Thinking time in milliseconds
   * @returns {Promise<{move: string, evaluation: number, nodes_searched: number}>}
   ***/
  async getBotMove(fen, timeMs) {
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
  }

  /**
   * Validate if a move is legal
   * @param {string} fen - Board position
   * @param {string} move - Move in UCI format
   */
  async validateMove(fen, move) {
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
  }

  /**
   * Calculate thinking time based on difficulty
   * @param {string} difficulty - 'easy', 'medium', 'hard'
   * @returns {number} Time in milliseconds
   */
  getThinkingTimeForDifficulty(difficulty) {
    const timeMap = {
      'easy': 500,    // 0.5 seconds - depth ~2-3
      'medium': 2000, // 2 seconds   - depth ~4-5
      'hard': 5000    // 5 seconds   - depth ~6-8
    };
    return timeMap[difficulty] || 2000;
  }
}

export default new BotService();