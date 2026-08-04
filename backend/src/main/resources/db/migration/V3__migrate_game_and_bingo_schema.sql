-- 운영 데이터는 변경하지 않고 게임·빙고 신규 구조만 확장한다.
-- 기존 상태 값은 Stable 호환성을 위해 유지하며 신규 상태 값만 함께 허용한다.

CREATE TABLE game_participants (
    id BIGINT NOT NULL AUTO_INCREMENT,
    game_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    joined_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_game_participants_game_member UNIQUE (game_id, member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE bingo_boards
    ADD COLUMN game_participant_id BIGINT NULL,
    ADD COLUMN board_type ENUM('PERSONAL', 'SHARED') NULL,
    ADD COLUMN target_bingo_count INT NULL,
    ADD CONSTRAINT uk_bingo_boards_game_participant UNIQUE (game_participant_id),
    MODIFY COLUMN status ENUM('ACTIVE', 'COMPLETED', 'EXPIRED', 'IN_PROGRESS') NOT NULL;

ALTER TABLE bingo_cells
    ADD COLUMN submitted_at DATETIME(6) NULL;

ALTER TABLE games
    MODIFY COLUMN status ENUM('ACTIVE', 'ENDED', 'IN_PROGRESS', 'COMPLETED') NOT NULL;

ALTER TABLE rooms
    MODIFY COLUMN status ENUM(
        'ACTIVE',
        'CLOSED',
        'CREATED',
        'WAITING',
        'READY',
        'IN_PROGRESS',
        'COMPLETED'
    ) NOT NULL;
