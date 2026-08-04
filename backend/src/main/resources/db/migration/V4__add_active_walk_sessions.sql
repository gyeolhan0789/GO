CREATE TABLE active_walk_sessions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    member_id BIGINT NOT NULL,
    room_id BIGINT NOT NULL,
    walk_session_key VARCHAR(36) NOT NULL,
    initial_bingo_board_id BIGINT NULL,
    started_at DATETIME(6) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_active_walk_sessions_member UNIQUE (member_id),
    CONSTRAINT uk_active_walk_sessions_key UNIQUE (walk_session_key),
    INDEX idx_active_walk_sessions_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
