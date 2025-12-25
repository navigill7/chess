import os
from pathlib import Path

def parse_book_txt(file_path):
    """
    Parse book.txt format:
    pos <fen>
    <move> <count>
    <move> <count>
    ...
    
    Returns: {simplified_fen: [(move_uci, count), ...], ...}
    """
    book_data = {}
    current_fen = None
    
    with open(file_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
                
            if line.startswith('pos '):
                # Extract FEN (remove "pos " prefix)
                current_fen = line[4:].strip()
                book_data[current_fen] = []
            elif current_fen:
                # Parse move and count
                parts = line.split()
                if len(parts) == 2:
                    move_uci = parts[0]
                    try:
                        count = int(parts[1])
                        book_data[current_fen].append((move_uci, count))
                    except ValueError:
                        continue
    
    return book_data


def load_opening_book():
    """Load opening book from book.txt"""
    base_dir = Path(__file__).resolve().parent.parent.parent
    book_path = base_dir / 'assets' / 'book.txt'

    print(f"Looking for book at: {book_path}")
    print(f"File exists: {book_path.exists()}")
    
    if not book_path.exists():
        print(f"Warning: Opening book not found at {book_path}")
        return None
    
    try:
        book_data = parse_book_txt(book_path)
        print(f"Loaded opening book with {len(book_data)} positions")
        return book_data
    except Exception as e:
        print(f"Error loading opening book: {e}")
        return None
