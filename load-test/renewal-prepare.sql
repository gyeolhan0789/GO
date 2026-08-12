-- 빙고 갱신 부하 테스트용 독립 fixture를 만든다.
-- 기본 5,000개이며 mysql --init-command로 @renewal_fixture_count를 덮어쓸 수 있다.
-- 모든 fixture는 서로 다른 회원/방/게임을 사용하고, 게임 시작 시각은 8일 전이다.

DELIMITER //

DROP PROCEDURE IF EXISTS prepare_k6_renewal_fixtures//
CREATE PROCEDURE prepare_k6_renewal_fixtures(IN fixture_count INT)
BEGIN
  IF fixture_count < 1 OR fixture_count > 10000 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'renewal fixture count must be between 1 and 10000';
  END IF;

  IF (SELECT COUNT(*) FROM missions) < 9 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'at least 9 missions are required';
  END IF;

  DROP TEMPORARY TABLE IF EXISTS k6_renewal_old_member_ids;
  DROP TEMPORARY TABLE IF EXISTS k6_renewal_old_room_ids;
  DROP TEMPORARY TABLE IF EXISTS k6_renewal_old_game_ids;
  DROP TEMPORARY TABLE IF EXISTS k6_renewal_old_board_ids;

  CREATE TEMPORARY TABLE k6_renewal_old_member_ids AS
  SELECT id FROM member WHERE email LIKE 'k6-renew-%@k6.local';

  CREATE TEMPORARY TABLE k6_renewal_old_room_ids AS
  SELECT id FROM rooms WHERE host_id IN (SELECT id FROM k6_renewal_old_member_ids);

  CREATE TEMPORARY TABLE k6_renewal_old_game_ids AS
  SELECT id FROM games WHERE room_id IN (SELECT id FROM k6_renewal_old_room_ids);

  CREATE TEMPORARY TABLE k6_renewal_old_board_ids AS
  SELECT id FROM bingo_boards WHERE game_id IN (SELECT id FROM k6_renewal_old_game_ids);

  DELETE FROM bingo_cells
  WHERE board_id IN (SELECT id FROM k6_renewal_old_board_ids);
  DELETE FROM bingo_boards
  WHERE id IN (SELECT id FROM k6_renewal_old_board_ids);
  DELETE FROM game_result_participants
  WHERE game_id IN (SELECT id FROM k6_renewal_old_game_ids);
  DELETE FROM game_results
  WHERE game_id IN (SELECT id FROM k6_renewal_old_game_ids);
  DELETE FROM game_participants
  WHERE game_id IN (SELECT id FROM k6_renewal_old_game_ids);
  DELETE FROM cash_histories
  WHERE member_id IN (SELECT id FROM k6_renewal_old_member_ids);
  DELETE FROM notification
  WHERE member_id IN (SELECT id FROM k6_renewal_old_member_ids);
  DELETE FROM games
  WHERE id IN (SELECT id FROM k6_renewal_old_game_ids);
  DELETE FROM room_members
  WHERE room_id IN (SELECT id FROM k6_renewal_old_room_ids);
  DELETE FROM rooms
  WHERE id IN (SELECT id FROM k6_renewal_old_room_ids);
  DELETE FROM friend_requests
  WHERE inviter_id IN (SELECT id FROM k6_renewal_old_member_ids);
  DELETE FROM friend_requests
  WHERE invitee_id IN (SELECT id FROM k6_renewal_old_member_ids);
  DELETE FROM friends
  WHERE member1_id IN (SELECT id FROM k6_renewal_old_member_ids);
  DELETE FROM friends
  WHERE member2_id IN (SELECT id FROM k6_renewal_old_member_ids);
  DELETE FROM member
  WHERE id IN (SELECT id FROM k6_renewal_old_member_ids);

  DROP TEMPORARY TABLE IF EXISTS k6_renewal_fixture_map;
  CREATE TEMPORARY TABLE k6_renewal_fixture_map (
    fixture_number INT NOT NULL PRIMARY KEY,
    member_id BIGINT NULL,
    room_id BIGINT NULL,
    game_id BIGINT NULL,
    board_id BIGINT NULL
  );

  INSERT INTO k6_renewal_fixture_map (fixture_number)
  SELECT ones.n + tens.n * 10 + hundreds.n * 100 + thousands.n * 1000 + 1 AS fixture_number
  FROM
    (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
     UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) ones
  CROSS JOIN
    (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
     UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) tens
  CROSS JOIN
    (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
     UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) hundreds
  CROSS JOIN
    (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
     UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) thousands
  WHERE ones.n + tens.n * 10 + hundreds.n * 100 + thousands.n * 1000 < fixture_count
  ORDER BY fixture_number;

  START TRANSACTION;

  INSERT INTO member (
    email,
    password,
    nickname,
    region,
    gender,
    cash,
    onboarding_completed,
    role,
    auth_provider,
    fcm_token,
    created_at,
    updated_at
  )
  SELECT
    CONCAT('k6-renew-', LPAD(fixture_number, 5, '0'), '@k6.local'),
    '$2a$10$kz3MgnxTzqdt.94hLDQe7.KfpsNLgCJuDg3AvtRx2fgSugGr1wJru',
    CONCAT('kr', LPAD(fixture_number, 5, '0')),
    'SEOUL',
    'MALE',
    0,
    TRUE,
    'USER',
    'LOCAL',
    NULL,
    NOW(6),
    NOW(6)
  FROM k6_renewal_fixture_map
  ORDER BY fixture_number;

  UPDATE k6_renewal_fixture_map fixture
  JOIN member m
    ON m.email = CONCAT('k6-renew-', LPAD(fixture.fixture_number, 5, '0'), '@k6.local')
  SET fixture.member_id = m.id;

  INSERT INTO rooms (
    board_size,
    target_bingo_count,
    target_step_count,
    host_id,
    name,
    mode,
    status,
    created_at,
    updated_at
  )
  SELECT
    3,
    1,
    1000,
    member_id,
    CONCAT('k6-renew-', LPAD(fixture_number, 5, '0')),
    'SINGLE',
    'ACTIVE',
    NOW(6),
    NOW(6)
  FROM k6_renewal_fixture_map
  ORDER BY fixture_number;

  UPDATE k6_renewal_fixture_map fixture
  JOIN rooms r
    ON r.host_id = fixture.member_id
   AND r.name = CONCAT('k6-renew-', LPAD(fixture.fixture_number, 5, '0'))
  SET fixture.room_id = r.id;

  INSERT INTO room_members (joined_at, member_id, room_id, created_at, updated_at)
  SELECT NOW(6), member_id, room_id, NOW(6), NOW(6)
  FROM k6_renewal_fixture_map
  ORDER BY fixture_number;

  INSERT INTO games (room_id, status, started_at, completed_at, created_at, updated_at)
  SELECT room_id, 'ACTIVE', DATE_SUB(NOW(6), INTERVAL 8 DAY), NULL, NOW(6), NOW(6)
  FROM k6_renewal_fixture_map
  ORDER BY fixture_number;

  UPDATE k6_renewal_fixture_map fixture
  JOIN games g
    ON g.room_id = fixture.room_id
   AND g.status = 'ACTIVE'
  SET fixture.game_id = g.id;

  INSERT INTO game_participants (game_id, member_id, joined_at, created_at, updated_at)
  SELECT game_id, member_id, DATE_SUB(NOW(6), INTERVAL 8 DAY), NOW(6), NOW(6)
  FROM k6_renewal_fixture_map
  ORDER BY fixture_number;

  INSERT INTO bingo_boards (
    board_size,
    target_bingo_count,
    target_step_count,
    game_id,
    game_participant_id,
    board_type,
    status,
    completed_at,
    created_at,
    updated_at
  )
  SELECT 3, 1, 1000, game_id, NULL, 'SHARED', 'ACTIVE', NULL, NOW(6), NOW(6)
  FROM k6_renewal_fixture_map
  ORDER BY fixture_number;

  UPDATE k6_renewal_fixture_map fixture
  JOIN bingo_boards board
    ON board.game_id = fixture.game_id
   AND board.status = 'ACTIVE'
  SET fixture.board_id = board.id;

  INSERT INTO bingo_cells (
    row_index,
    col_index,
    board_id,
    mission_id,
    member_id,
    verification_status,
    submit_url,
    rejection_reason,
    submitted_at,
    completed_at,
    created_at,
    updated_at
  )
  SELECT
    FLOOR((mission.position_number - 1) / 3),
    MOD(mission.position_number - 1, 3),
    fixture.board_id,
    mission.id,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NOW(6),
    NOW(6)
  FROM k6_renewal_fixture_map fixture
  CROSS JOIN (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS position_number
    FROM missions
    ORDER BY id
    LIMIT 9
  ) mission
  ORDER BY fixture.fixture_number, mission.position_number;

  COMMIT;

  SELECT
    COUNT(*) AS fixtures,
    COUNT(member_id) AS members,
    COUNT(room_id) AS rooms,
    COUNT(game_id) AS games,
    COUNT(board_id) AS boards
  FROM k6_renewal_fixture_map;
END//

DELIMITER ;

SET @renewal_fixture_count = COALESCE(@renewal_fixture_count, 5000);
CALL prepare_k6_renewal_fixtures(@renewal_fixture_count);
DROP PROCEDURE prepare_k6_renewal_fixtures;
