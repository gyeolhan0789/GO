ALTER TABLE walk_sessions
    ADD COLUMN active_duration_seconds BIGINT NULL AFTER ended_at;

UPDATE walk_sessions
SET active_duration_seconds = TIMESTAMPDIFF(SECOND, started_at, ended_at)
WHERE active_duration_seconds IS NULL;

ALTER TABLE walk_sessions
    MODIFY COLUMN active_duration_seconds BIGINT NOT NULL;
