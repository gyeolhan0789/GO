ALTER TABLE walk_sessions
    ADD COLUMN mission_earned_point BIGINT NOT NULL DEFAULT 0 AFTER calories,
    ADD COLUMN step_goal_earned_point BIGINT NOT NULL DEFAULT 0 AFTER mission_earned_point,
    ADD COLUMN game_earned_point BIGINT NOT NULL DEFAULT 0 AFTER step_goal_earned_point;

CREATE INDEX idx_point_histories_member_room_created
    ON point_histories (member_id, room_id, created_at);

UPDATE walk_sessions ws
SET ws.mission_earned_point = (
    SELECT COALESCE(SUM(ph.amount), 0)
    FROM walk_session_bingo_achievements achievement
    JOIN point_histories ph
      ON ph.transaction_type = 'BINGO_CELL_REWARD'
     AND ph.reference_id = achievement.bingo_cell_id
     AND ph.member_id = ws.member_id
    WHERE achievement.walk_session_id = ws.id
      AND ph.amount > 0
);
