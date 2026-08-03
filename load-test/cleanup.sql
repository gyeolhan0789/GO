-- k6 부하 테스트로 생성된 데이터를 정리한다.
-- 대상 식별: auth.js가 만드는 계정 이메일 패턴(k6-{VU}-{timestamp}-{seq}@k6.local)을 기준으로,
-- 거기서 파생된 방/게임/빙고/친구/알림 등 데이터를 자식 -> 부모 순으로 삭제한다.
-- friends/friend_requests는 member에 대한 실제 FK 제약이 걸려 있어 member보다 먼저 지워야 한다
-- (나머지 테이블은 Hibernate가 raw Long 컬럼으로만 연관관계를 매핑해 FK 제약이 없다).
-- 실행: mysql -h <host> -P <port> -u wecandoit -p wecandoit < cleanup.sql

CREATE TEMPORARY TABLE k6_member_ids AS
SELECT id FROM member WHERE email LIKE 'k6-%@k6.local';

CREATE TEMPORARY TABLE k6_room_ids AS
SELECT id FROM rooms WHERE host_id IN (SELECT id FROM k6_member_ids);

CREATE TEMPORARY TABLE k6_game_ids AS
SELECT id FROM games WHERE room_id IN (SELECT id FROM k6_room_ids);

CREATE TEMPORARY TABLE k6_board_ids AS
SELECT id FROM bingo_boards WHERE game_id IN (SELECT id FROM k6_game_ids);

SELECT
  (SELECT COUNT(*) FROM k6_member_ids) AS members,
  (SELECT COUNT(*) FROM k6_room_ids) AS rooms,
  (SELECT COUNT(*) FROM k6_game_ids) AS games,
  (SELECT COUNT(*) FROM k6_board_ids) AS boards;

DELETE FROM bingo_cells WHERE board_id IN (SELECT id FROM k6_board_ids);
DELETE FROM bingo_boards WHERE id IN (SELECT id FROM k6_board_ids);
DELETE FROM game_result_participants WHERE game_id IN (SELECT id FROM k6_game_ids);
DELETE FROM game_results WHERE game_id IN (SELECT id FROM k6_game_ids);
DELETE FROM game_participants WHERE game_id IN (SELECT id FROM k6_game_ids);
-- MySQL은 TEMPORARY 테이블을 한 쿼리 안에서 두 번 이상 참조하지 못한다
-- ("Can't reopen table") 그래서 OR 조건 대신 컬럼별로 DELETE를 나눈다.
DELETE FROM game_requests WHERE room_id IN (SELECT id FROM k6_room_ids);
DELETE FROM game_requests WHERE inviter_id IN (SELECT id FROM k6_member_ids);
DELETE FROM game_requests WHERE invitee_id IN (SELECT id FROM k6_member_ids);
DELETE FROM games WHERE id IN (SELECT id FROM k6_game_ids);
DELETE FROM room_members WHERE room_id IN (SELECT id FROM k6_room_ids);
DELETE FROM rooms WHERE id IN (SELECT id FROM k6_room_ids);

DELETE FROM friend_requests WHERE inviter_id IN (SELECT id FROM k6_member_ids);
DELETE FROM friend_requests WHERE invitee_id IN (SELECT id FROM k6_member_ids);
DELETE FROM friends WHERE member1_id IN (SELECT id FROM k6_member_ids);
DELETE FROM friends WHERE member2_id IN (SELECT id FROM k6_member_ids);
DELETE FROM member_items WHERE member_id IN (SELECT id FROM k6_member_ids);
DELETE FROM member_histories WHERE member_id IN (SELECT id FROM k6_member_ids);
DELETE FROM notification WHERE member_id IN (SELECT id FROM k6_member_ids);
DELETE FROM cash_histories WHERE member_id IN (SELECT id FROM k6_member_ids);

DELETE FROM member WHERE id IN (SELECT id FROM k6_member_ids);

DROP TEMPORARY TABLE k6_member_ids, k6_room_ids, k6_game_ids, k6_board_ids;
