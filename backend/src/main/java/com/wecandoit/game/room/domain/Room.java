package com.wecandoit.game.room.domain;

import com.wecandoit.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "rooms")
public class Room extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "host_id", nullable = false)
    private Long hostId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private GameMode mode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private GameRoomStatus status;

    @Column(name = "target_bingo_count", nullable = false)
    private int targetBingoCount;

    @Column(name = "board_size", nullable = false)
    private int boardSize;

    @Column(name = "target_step_count")
    private Integer targetStepCount;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    private Room(Long hostId, GameMode mode, int targetBingoCount, int boardSize, Integer targetStepCount) {
        this.hostId = hostId;
        this.mode = mode;
        this.status = GameRoomStatus.CREATED;
        this.targetBingoCount = targetBingoCount;
        this.boardSize = boardSize;
        this.targetStepCount = targetStepCount;
    }

    public static Room create(Long hostId, GameMode mode, int targetBingoCount, int boardSize, Integer targetStepCount) {
        return new Room(hostId, mode, targetBingoCount, boardSize, targetStepCount);
    }

    public boolean isHost(Long memberId) {
        return hostId.equals(memberId);
    }

    public boolean isClosed() {
        return status == GameRoomStatus.CLOSED;
    }

    public boolean isReady() {
        return status == GameRoomStatus.READY;
    }

    public boolean isCompleted() {
        return status == GameRoomStatus.COMPLETED;
    }

    public void start() {
        this.status = GameRoomStatus.IN_PROGRESS;
        this.startedAt = LocalDateTime.now();
    }

    public void close() {
        this.status = GameRoomStatus.CLOSED;
    }

    public void complete() {
        this.status = GameRoomStatus.COMPLETED;
    }
}
