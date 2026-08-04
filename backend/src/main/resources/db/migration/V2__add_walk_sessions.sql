ALTER TABLE bingo_cells
    ADD COLUMN client_session_key VARCHAR(36) NULL AFTER submit_url,
    ADD INDEX idx_bingo_cells_member_client_session_key (member_id, client_session_key);

CREATE TABLE walk_sessions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    member_id BIGINT NOT NULL,
    room_id BIGINT NOT NULL,
    client_session_key VARCHAR(36) NOT NULL,
    initial_bingo_board_id BIGINT NULL,
    started_at DATETIME(6) NOT NULL,
    ended_at DATETIME(6) NOT NULL,
    step INT NOT NULL,
    distance INT NOT NULL,
    calories INT NOT NULL,
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_walk_sessions_member_client_key UNIQUE (member_id, client_session_key),
    INDEX idx_walk_sessions_member_ended_id (member_id, ended_at, id),
    INDEX idx_walk_sessions_member_room_ended_id (member_id, room_id, ended_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE walk_session_bingo_achievements (
    id BIGINT NOT NULL AUTO_INCREMENT,
    walk_session_id BIGINT NOT NULL,
    bingo_board_id BIGINT NOT NULL,
    bingo_cell_id BIGINT NOT NULL,
    achieved_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_walk_session_achievements_session_cell UNIQUE (walk_session_id, bingo_cell_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
