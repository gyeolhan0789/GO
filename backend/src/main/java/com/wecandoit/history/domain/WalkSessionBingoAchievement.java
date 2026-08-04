package com.wecandoit.history.domain;

import com.wecandoit.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
        name = "walk_session_bingo_achievements",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_walk_session_achievements_session_cell",
                columnNames = {"walk_session_id", "bingo_cell_id"}
        )
)
public class WalkSessionBingoAchievement extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "walk_session_id", nullable = false)
    private Long walkSessionId;

    @Column(name = "bingo_board_id", nullable = false)
    private Long bingoBoardId;

    @Column(name = "bingo_cell_id", nullable = false)
    private Long bingoCellId;

    @Column(name = "achieved_at", nullable = false)
    private Instant achievedAt;

    private WalkSessionBingoAchievement(
            Long walkSessionId,
            Long bingoBoardId,
            Long bingoCellId,
            Instant achievedAt
    ) {
        this.walkSessionId = walkSessionId;
        this.bingoBoardId = bingoBoardId;
        this.bingoCellId = bingoCellId;
        this.achievedAt = achievedAt;
    }

    public static WalkSessionBingoAchievement create(
            Long walkSessionId,
            Long bingoBoardId,
            Long bingoCellId,
            Instant achievedAt
    ) {
        return new WalkSessionBingoAchievement(walkSessionId, bingoBoardId, bingoCellId, achievedAt);
    }
}
