class TranspositionTable:
    LOOKUP_FAILED = -1
    
    # Node types
    EXACT = 0      # Exact evaluation
    LOWER_BOUND = 1  # Beta cutoff (eval could be higher)
    UPPER_BOUND = 2  # All moves <= alpha (eval could be lower)
    
    def __init__(self, size_mb=64):
        """Initialize transposition table with given size in MB"""
        import sys
        
        # Calculate number of entries based on size
        entry_size = sys.getsizeof(Entry())
        desired_size_bytes = size_mb * 1024 * 1024
        num_entries = desired_size_bytes // entry_size
        
        self.count = num_entries
        self.entries = [Entry() for _ in range(num_entries)]
        self.enabled = True
    
    def clear(self):
        """Clear all entries"""
        self.entries = [Entry() for _ in range(self.count)]
    
    def get_index(self, zobrist_key):
        """Get index for zobrist key"""
        return zobrist_key % self.count
    
    def try_get_stored_move(self, zobrist_key):
        """Try to get stored move for position"""
        index = self.get_index(zobrist_key)
        entry = self.entries[index]
        if entry.key == zobrist_key:
            return entry.move
        return None
    
    def lookup_evaluation(self, zobrist_key, depth, ply_from_root, alpha, beta):
        """
        Look up stored evaluation for current position.
        Returns stored eval if found and valid, otherwise LOOKUP_FAILED.
        """
        if not self.enabled:
            return self.LOOKUP_FAILED
        
        index = self.get_index(zobrist_key)
        entry = self.entries[index]
        
        if entry.key == zobrist_key:
            # Only use if searched to at least same depth
            if entry.depth >= depth:
                corrected_score = self._correct_retrieved_mate_score(
                    entry.value, ply_from_root
                )
                
                # Exact evaluation
                if entry.node_type == self.EXACT:
                    return corrected_score
                
                # Upper bound - return if <= alpha
                if entry.node_type == self.UPPER_BOUND and corrected_score <= alpha:
                    return corrected_score
                
                # Lower bound - return if >= beta (causes cutoff)
                if entry.node_type == self.LOWER_BOUND and corrected_score >= beta:
                    return corrected_score
        
        return self.LOOKUP_FAILED
    
    def store_evaluation(self, zobrist_key, depth, ply_from_root, eval_score, 
                        eval_type, move):
        """Store evaluation in transposition table"""
        if not self.enabled:
            return
        
        index = self.get_index(zobrist_key)
        corrected_score = self._correct_mate_score_for_storage(
            eval_score, ply_from_root
        )
        
        entry = Entry(
            key=zobrist_key,
            value=corrected_score,
            depth=depth,
            node_type=eval_type,
            move=move
        )
        self.entries[index] = entry
    
    def _correct_mate_score_for_storage(self, score, ply_from_root):
        """Adjust mate scores to be independent of current search depth"""
        if self._is_mate_score(score):
            sign = 1 if score > 0 else -1
            return (abs(score) + ply_from_root) * sign
        return score
    
    def _correct_retrieved_mate_score(self, score, ply_from_root):
        """Adjust retrieved mate scores to current search depth"""
        if self._is_mate_score(score):
            sign = 1 if score > 0 else -1
            return (abs(score) - ply_from_root) * sign
        return score
    
    @staticmethod
    def _is_mate_score(score):
        """Check if score represents a mate"""
        IMMEDIATE_MATE_SCORE = 100000
        MAX_MATE_DEPTH = 1000
        return abs(score) > IMMEDIATE_MATE_SCORE - MAX_MATE_DEPTH


class Entry:
    """Single transposition table entry"""
    
    def __init__(self, key=0, value=0, depth=0, node_type=0, move=None):
        self.key = key
        self.value = value
        self.depth = depth
        self.node_type = node_type
        self.move = move