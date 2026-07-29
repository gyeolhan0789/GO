package com.wecandoit.game.domain;

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

    @Column(name = "target_bingo_count")
    private Integer targetBingoCount;

    @Column(name = "target_step_count")
    private Integer targetStepCount;

    @Column(name = "board_size", nullable = false)
    private int boardSize;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    private Room(
            Long hostId,
            GameMode mode,
            Integer targetBingoCount,
            Integer targetStepCount,
            int boardSize
    ) {
        this.hostId = hostId;
        this.mode = mode;
        this.status = GameRoomStatus.CREATED;
        this.targetBingoCount = targetBingoCount;
        this.targetStepCount = targetStepCount;
        this.boardSize = boardSize;
    }

    public static Room create(Long hostId, GameMode mode, Integer targetBingoCount, int boardSize) {
        return create(hostId, mode, targetBingoCount, null, boardSize);
    }

    public static Room create(
            Long hostId,
            GameMode mode,
            Integer targetBingoCount,
            Integer targetStepCount,
            int boardSize
    ) {
        return new Room(hostId, mode, targetBingoCount, targetStepCount, boardSize);
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

    public void updateParticipantStatus(long participantCount) {
        if (mode == GameMode.SINGLE
                || status == GameRoomStatus.IN_PROGRESS
                || status == GameRoomStatus.COMPLETED
                || status == GameRoomStatus.CLOSED) {
            return;
        }

        if (participantCount >= mode.getMinimumParticipants()) {
            this.status = GameRoomStatus.READY;
            return;
        }

        this.status = GameRoomStatus.WAITING;
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

    public void finishGame(long participantCount) {
        if (mode == GameMode.SINGLE) {
            complete();
            return;
        }
        this.status = participantCount >= mode.getMinimumParticipants()
                ? GameRoomStatus.READY
                : GameRoomStatus.WAITING;
    }
}
