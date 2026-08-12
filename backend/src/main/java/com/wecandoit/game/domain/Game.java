package com.wecandoit.game.domain;

import com.wecandoit.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
        name = "games",
        indexes = @Index(name = "idx_games_room_id_status", columnList = "room_id,status")
)
public class Game extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GameStatus status;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    private Game(Long roomId) {
        this.roomId = roomId;
        this.status = GameStatus.ACTIVE;
        this.startedAt = LocalDateTime.now();
    }

    public static Game start(Long roomId) {
        return new Game(roomId);
    }

    public void complete() {
        completeAt(LocalDateTime.now());
    }

    public void completeAt(LocalDateTime completedAt) {
        this.status = GameStatus.ENDED;
        this.completedAt = completedAt;
    }
}
