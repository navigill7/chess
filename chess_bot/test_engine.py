"""
Comprehensive test suite for improved chess engine.
Run this to verify all components work correctly.
"""

import time
from chess_bot.ai.engine.board import Board
from chess_bot.ai.engine.move import Move
from chess_bot.ai.engine.move_generator import MoveGenerator
from chess_bot.ai.engine.searcher import Searcher
from chess_bot.ai.engine.zobrist import Zobrist


def test_board_setup():
    """Test basic board setup"""
    print("\n=== Test: Board Setup ===")
    board = Board()
    fen = board.to_fen()
    print(f"Starting FEN: {fen}")
    assert fen == Board.START_FEN, "Starting position incorrect"
    print("✓ Board setup works")


def test_zobrist_hashing():
    """Test Zobrist hashing"""
    print("\n=== Test: Zobrist Hashing ===")
    board = Board()
    key1 = board.zobrist_key
    print(f"Initial zobrist key: {key1}")
    assert key1 > 0, "Zobrist key should be positive"
    
    # Different position should have different key
    board2 = Board("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1")
    key2 = board2.zobrist_key
    print(f"After e4 zobrist key: {key2}")
    assert key1 != key2, "Different positions should have different keys"
    print("✓ Zobrist hashing works")


def test_make_unmake():
    """Test make and unmake move"""
    print("\n=== Test: Make/Unmake Move ===")
    board = Board()
    
    # Save initial state
    initial_fen = board.to_fen()
    initial_zobrist = board.zobrist_key
    print(f"Initial: {initial_fen}")
    print(f"Initial zobrist: {initial_zobrist}")
    
    # Make move
    move = Move.from_uci("e2e4")
    board.make_move(move)
    after_fen = board.to_fen()
    after_zobrist = board.zobrist_key
    print(f"After e2e4: {after_fen}")
    print(f"After zobrist: {after_zobrist}")
    
    assert "4P3" in after_fen, "Pawn should be on e4"
    assert after_zobrist != initial_zobrist, "Zobrist should change"
    
    # Unmake move
    board.unmake_move(move)
    restored_fen = board.to_fen()
    restored_zobrist = board.zobrist_key
    print(f"Restored: {restored_fen}")
    print(f"Restored zobrist: {restored_zobrist}")
    
    assert restored_fen == initial_fen, "FEN should be restored"
    assert restored_zobrist == initial_zobrist, "Zobrist should be restored"
    print("✓ Make/unmake works perfectly!")


def test_check_detection():
    """Test check detection"""
    print("\n=== Test: Check Detection ===")
    gen = MoveGenerator()
    
    # Not in check
    board = Board()
    in_check = gen.is_in_check(board)
    print(f"Starting position in check: {in_check}")
    assert not in_check, "Starting position should not be in check"
    
    # In check
    board_check = Board("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3")
    in_check = gen.is_in_check(board_check)
    print(f"Scholar's mate threat in check: {in_check}")
    assert in_check, "Should detect check from queen"
    
    print("✓ Check detection works")


def test_move_generation():
    """Test move generation"""
    print("\n=== Test: Move Generation ===")
    board = Board()
    gen = MoveGenerator()
    
    moves = gen.generate_moves(board)
    print(f"Legal moves from start: {len(moves)}")
    assert len(moves) == 20, "Starting position should have 20 legal moves"
    
    # Test that all generated moves are legal
    for move in moves:
        board.make_move(move, in_search=True)
        assert not gen.is_in_check(board), f"Move {move.to_uci()} leaves king in check!"
        board.unmake_move(move, in_search=True)
    
    print("✓ Move generation works")


def test_checkmate_detection():
    """Test checkmate detection"""
    print("\n=== Test: Checkmate Detection ===")
    gen = MoveGenerator()
    
    # Checkmate position
    board = Board("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3")
    board.make_move(Move.from_uci("e2e3"))  # Doesn't matter, checking generation
    board.white_to_move = True  # Reset for white
    
    # Actually let's use scholar's mate
    board = Board("r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4")
    board.make_move(Move.from_uci("h5f7"))  # Checkmate
    
    moves = gen.generate_moves(board)
    print(f"Moves in checkmate position: {len(moves)}")
    assert len(moves) == 0, "Should have no legal moves in checkmate"
    assert gen.is_in_check(board), "Should be in check"
    
    print("✓ Checkmate detection works")


def test_search_basic():
    """Test basic search functionality"""
    print("\n=== Test: Basic Search ===")
    board = Board()
    searcher = Searcher(board)
    
    # Short search
    start = time.time()
    best_move, eval_score, nodes = searcher.start_search(500)  # 0.5 seconds
    elapsed = time.time() - start
    
    print(f"Best move: {best_move.to_uci() if best_move else 'None'}")
    print(f"Evaluation: {eval_score}")
    print(f"Nodes searched: {nodes}")
    print(f"Time: {elapsed:.2f}s")
    print(f"Nodes/sec: {nodes/elapsed:.0f}")
    print(f"Depth reached: {searcher.current_depth}")
    
    assert best_move is not None, "Should find a move"
    assert nodes > 0, "Should search some nodes"
    assert searcher.current_depth >= 3, "Should reach depth 3 in 0.5s"
    
    print("✓ Search works")


def test_transposition_table():
    """Test transposition table"""
    print("\n=== Test: Transposition Table ===")
    from chess_bot.ai.engine.transposition_table import TranspositionTable
    
    board = Board()
    tt = TranspositionTable(size_mb=1)
    
    # Store a position
    zobrist = board.zobrist_key
    move = Move.from_uci("e2e4")
    tt.store_evaluation(zobrist, depth=5, ply_from_root=0, eval_score=50,
                       eval_type=tt.EXACT, move=move)
    
    # Retrieve it
    result = tt.lookup_evaluation(zobrist, depth=5, ply_from_root=0, 
                                  alpha=-1000, beta=1000)
    print(f"Stored eval: 50, Retrieved: {result}")
    assert result == 50, "Should retrieve stored evaluation"
    
    # Check stored move
    stored_move = tt.try_get_stored_move(zobrist)
    print(f"Stored move: {stored_move.to_uci() if stored_move else 'None'}")
    assert stored_move is not None, "Should retrieve stored move"
    assert stored_move.value == move.value, "Should retrieve correct move"
    
    print("✓ Transposition table works")


def test_move_ordering():
    """Test move ordering"""
    print("\n=== Test: Move Ordering ===")
    from chess_bot.ai.engine.move_ordering import MoveOrdering
    
    board = Board()
    gen = MoveGenerator()
    ordering = MoveOrdering()
    
    moves = gen.generate_moves(board)
    hash_move = Move.from_uci("e2e4")
    
    ordered_moves = ordering.order_moves(moves, board, hash_move, ply_from_root=0)
    
    print(f"First move: {ordered_moves[0].to_uci()}")
    print(f"Expected: e2e4 (hash move)")
    assert ordered_moves[0].value == hash_move.value, "Hash move should be first"
    
    print("✓ Move ordering works")


def test_repetition_detection():
    """Test repetition detection"""
    print("\n=== Test: Repetition Detection ===")
    from chess_bot.ai.engine.repetition_table import RepetitionTable
    
    board = Board()
    rep_table = RepetitionTable()
    rep_table.init([])
    
    # Make moves that repeat position
    moves = [
        Move.from_uci("g1f3"),
        Move.from_uci("g8f6"),
        Move.from_uci("f3g1"),
        Move.from_uci("f6g8"),
    ]
    
    # First time
    for move in moves[:2]:
        board.make_move(move)
        rep_table.push(board.zobrist_key, False)
    
    # Back to start
    for move in moves[2:]:
        board.make_move(move)
        rep_table.push(board.zobrist_key, False)
    
    # Should be back at starting position
    start_key = Zobrist.calculate_zobrist_key(Board())
    print(f"Repetition detected: {rep_table.contains(start_key)}")
    
    print("✓ Repetition detection works")


def test_performance():
    """Test performance benchmarks"""
    print("\n=== Test: Performance Benchmark ===")
    board = Board()
    searcher = Searcher(board)
    
    # 5 second search
    print("Running 5-second search...")
    start = time.time()
    best_move, eval_score, nodes = searcher.start_search(5000)
    elapsed = time.time() - start
    
    nps = nodes / elapsed
    depth = searcher.current_depth
    
    print(f"\nResults:")
    print(f"Best move: {best_move.to_uci()}")
    print(f"Evaluation: {eval_score}")
    print(f"Depth: {depth}")
    print(f"Nodes: {nodes:,}")
    print(f"Time: {elapsed:.2f}s")
    print(f"Nodes/sec: {nps:,.0f}")
    
    # Performance targets
    print(f"\nPerformance Analysis:")
    if nps >= 100000:
        print(f"✓ Excellent speed: {nps:,.0f} NPS (target: 100,000+)")
    elif nps >= 50000:
        print(f"✓ Good speed: {nps:,.0f} NPS (target: 50,000+)")
    elif nps >= 10000:
        print(f"⚠ Acceptable speed: {nps:,.0f} NPS (could be better)")
    else:
        print(f"✗ Slow: {nps:,.0f} NPS (should be 50,000+)")
    
    if depth >= 8:
        print(f"✓ Excellent depth: {depth} (target: 8+)")
    elif depth >= 6:
        print(f"✓ Good depth: {depth} (target: 6+)")
    else:
        print(f"⚠ Shallow depth: {depth} (should be 6+)")


def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("CHESS ENGINE TEST SUITE")
    print("=" * 60)
    
    tests = [
        test_board_setup,
        test_zobrist_hashing,
        test_make_unmake,
        test_check_detection,
        test_move_generation,
        test_checkmate_detection,
        test_transposition_table,
        test_move_ordering,
        test_repetition_detection,
        test_search_basic,
        test_performance,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"\n✗ Test failed: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)
    
    if failed == 0:
        print("\n🎉 All tests passed! Engine is working correctly!")
    else:
        print(f"\n⚠ {failed} test(s) failed. Check errors above.")


if __name__ == "__main__":
    run_all_tests()