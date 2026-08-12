-- 갱신 후 각 fixture 방에 ACTIVE 게임/빙고판이 정확히 하나인지 검증한다.
WITH fixture_rooms AS (
  SELECT r.id
  FROM rooms r
  JOIN member m ON m.id = r.host_id
  WHERE m.email LIKE 'k6-renew-%@k6.local'
),
game_stats AS (
  SELECT
    room.id AS room_id,
    COUNT(game.id) AS game_count,
    SUM(game.status = 'ACTIVE') AS active_game_count,
    SUM(game.status = 'ENDED') AS ended_game_count,
    COUNT(result.id) AS result_count
  FROM fixture_rooms room
  LEFT JOIN games game ON game.room_id = room.id
  LEFT JOIN game_results result ON result.game_id = game.id
  GROUP BY room.id
),
active_board_stats AS (
  SELECT
    game.room_id,
    SUM(board.status = 'ACTIVE') AS active_board_count
  FROM games game
  JOIN fixture_rooms room ON room.id = game.room_id
  LEFT JOIN bingo_boards board ON board.game_id = game.id
  WHERE game.status = 'ACTIVE'
  GROUP BY game.room_id
)
SELECT
  COUNT(*) AS fixture_rooms,
  SUM(game_stats.active_game_count = 1) AS rooms_with_one_active_game,
  SUM(COALESCE(active_board_stats.active_board_count, 0) = 1) AS rooms_with_one_active_board,
  SUM(game_stats.game_count = 2
      AND game_stats.ended_game_count = 1
      AND game_stats.result_count = 1) AS renewed_rooms,
  SUM(game_stats.game_count = 1
      AND game_stats.active_game_count = 1
      AND game_stats.result_count = 0) AS untouched_rooms,
  SUM(game_stats.active_game_count <> 1) AS invalid_active_game_rooms,
  SUM(COALESCE(active_board_stats.active_board_count, 0) <> 1) AS invalid_active_board_rooms
FROM game_stats
LEFT JOIN active_board_stats ON active_board_stats.room_id = game_stats.room_id;

SELECT room_id, COUNT(*) AS active_game_count
FROM games
WHERE status = 'ACTIVE'
  AND room_id IN (
    SELECT r.id
    FROM rooms r
    JOIN member m ON m.id = r.host_id
    WHERE m.email LIKE 'k6-renew-%@k6.local'
  )
GROUP BY room_id
HAVING COUNT(*) <> 1;
