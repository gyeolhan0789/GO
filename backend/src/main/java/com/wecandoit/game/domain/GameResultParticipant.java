package com.wecandoit.game.domain;

import com.wecandoit.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
        name = "game_result_participants",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_game_result_participants_game_member",
                columnNames = {"game_id", "member_id"}
        )
)
public class GameResultParticipant extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id", nullable = false)
    private Long gameId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "completed_mission_count", nullable = false)
    private int completedMissionCount;

    @Column(name = "reward_point", nullable = false)
    private long rewardPoint;

    @Column(name = "result")
    private Boolean result;

    private GameResultParticipant(
            Long gameId,
            Long memberId,
            int completedMissionCount,
            long rewardPoint,
            Boolean result
    ) {
        this.gameId = gameId;
        this.memberId = memberId;
        this.completedMissionCount = completedMissionCount;
        this.rewardPoint = rewardPoint;
        this.result = result;
    }

    public static GameResultParticipant create(
            Long gameId,
            Long memberId,
            int completedMissionCount,
            long rewardPoint,
            boolean result
    ) {
        return new GameResultParticipant(gameId, memberId, completedMissionCount, rewardPoint, result);
    }
}
