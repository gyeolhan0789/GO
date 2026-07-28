package com.wecandoit.game.domain;

import com.wecandoit.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "game_results")
public class GameResult extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id", nullable = false, unique = true)
    private Long gameId;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(nullable = false)
    private boolean result;

    @Column(name = "bingo_count", nullable = false)
    private int bingoCount;

    @Column(name = "completed_mission_count", nullable = false)
    private int completedMissionCount;

    // TODO: 보상 정책 확정 후 계산 로직 추가 (현재는 0으로 고정)
    @Column(name = "reward_cash", nullable = false)
    private long rewardCash;

    private GameResult(
            Long gameId,
            Long roomId,
            boolean result,
            int bingoCount,
            int completedMissionCount,
            long rewardCash
    ) {
        this.gameId = gameId;
        this.roomId = roomId;
        this.result = result;
        this.bingoCount = bingoCount;
        this.completedMissionCount = completedMissionCount;
        this.rewardCash = rewardCash;
    }

    public static GameResult create(
            Long gameId,
            Long roomId,
            boolean result,
            int bingoCount,
            int completedMissionCount,
            long rewardCash
    ) {
        return new GameResult(gameId, roomId, result, bingoCount, completedMissionCount, rewardCash);
    }
}
