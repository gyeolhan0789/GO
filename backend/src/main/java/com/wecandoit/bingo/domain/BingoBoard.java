package com.wecandoit.bingo.domain;

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
@Table(name = "bingo_boards")
public class BingoBoard extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id", nullable = false)
    private Long gameId;

    @Column(name = "game_participant_id", unique = true)
    private Long gameParticipantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "board_type", nullable = false, length = 20)
    private BingoBoardType type;

    @Column(name = "board_size", nullable = false)
    private int boardSize;

    @Column(name = "target_step_count")
    private Integer targetStepCount;

    @Column(name = "target_bingo_count")
    private Integer targetBingoCount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BingoBoardStatus status;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    private BingoBoard(Long gameId, int boardSize, Integer targetStepCount) {
        this.gameId = gameId;
        this.boardSize = boardSize;
        this.targetStepCount = targetStepCount;
        this.type = BingoBoardType.SHARED;
        this.status = BingoBoardStatus.ACTIVE;
    }

    private BingoBoard(Long gameId, Long gameParticipantId, int boardSize, int targetBingoCount) {
        this.gameId = gameId;
        this.gameParticipantId = gameParticipantId;
        this.boardSize = boardSize;
        this.targetBingoCount = targetBingoCount;
        this.type = BingoBoardType.PERSONAL;
        this.status = BingoBoardStatus.ACTIVE;
    }

    public static BingoBoard create(Long gameId, int boardSize) {
        return create(gameId, boardSize, null);
    }

    public static BingoBoard create(Long gameId, int boardSize, Integer targetStepCount) {
        return new BingoBoard(gameId, boardSize, targetStepCount);
    }

    public static BingoBoard createForBattle(
            Long gameId,
            Long gameParticipantId,
            int boardSize,
            int targetBingoCount
    ) {
        return new BingoBoard(gameId, gameParticipantId, boardSize, targetBingoCount);
    }

    public boolean isShared() {
        return type == BingoBoardType.SHARED;
    }

    public boolean isPersonal() {
        return type == BingoBoardType.PERSONAL;
    }

    public boolean isActive() {
        return status == BingoBoardStatus.ACTIVE;
    }

    public boolean isCompleted() {
        return status == BingoBoardStatus.COMPLETED;
    }

    public boolean isExpired() {
        return status == BingoBoardStatus.EXPIRED;
    }

    public void expire() {
        expireAt(LocalDateTime.now());
    }

    public void complete() {
        completeAt(LocalDateTime.now());
    }

    public void completeAt(LocalDateTime completedAt) {
        this.status = BingoBoardStatus.COMPLETED;
        this.completedAt = completedAt;
    }

    public void expireAt(LocalDateTime expiredAt) {
        this.status = BingoBoardStatus.EXPIRED;
        this.completedAt = expiredAt;
    }

}
