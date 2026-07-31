package com.wecandoit.game.domain;

import com.wecandoit.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
        name = "game_participants",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_game_participants_game_member",
                columnNames = {"game_id", "member_id"}
        )
)
public class GameParticipant extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id", nullable = false)
    private Long gameId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    private GameParticipant(Long gameId, Long memberId) {
        this.gameId = gameId;
        this.memberId = memberId;
        this.joinedAt = LocalDateTime.now();
    }

    public static GameParticipant create(Long gameId, Long memberId) {
        return new GameParticipant(gameId, memberId);
    }
}
