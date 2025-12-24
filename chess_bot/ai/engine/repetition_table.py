class RepetitionTable:
    """Tracks position history for draw by repetition detection"""
    
    def __init__(self, max_size=256):
        """Initialize repetition table"""
        self.hashes = [0] * max_size
        self.start_indices = [0] * (max_size + 1)
        self.count = 0
        self.max_size = max_size
    
    def init(self, position_history):
        """
        Initialize from board's position history.
        position_history should be a list of zobrist hashes from oldest to newest.
        """
        self.count = min(len(position_history), self.max_size)
        
        for i in range(self.count):
            self.hashes[i] = position_history[i]
            self.start_indices[i] = 0
        
        self.start_indices[self.count] = 0
    
    def push(self, zobrist_hash, reset=False):
        """
        Push a new position onto the stack.
        reset=True means this is an irreversible move (pawn move or capture)
        """
        if self.count < self.max_size:
            self.hashes[self.count] = zobrist_hash
            # If reset, this becomes new starting point for repetition checking
            self.start_indices[self.count + 1] = self.count if reset else self.start_indices[self.count]
        self.count += 1
    
    def pop(self):
        """Pop the last position from the stack"""
        if self.count > 0:
            self.count -= 1
    
    def try_pop(self):
        """Safely pop from stack"""
        self.pop()
    
    def contains(self, zobrist_hash):
        """
        Check if position has occurred before in current search.
        Does not count the current position (count-1).
        """
        start = self.start_indices[self.count]
        
        # Check up to count-1 so current position is not counted
        for i in range(start, self.count - 1):
            if self.hashes[i] == zobrist_hash:
                return True
        
        return False