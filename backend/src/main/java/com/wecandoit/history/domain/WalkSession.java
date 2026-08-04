package com.wecandoit.history.domain;

import com.wecandoit.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Duration;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
        name = "walk_sessions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_walk_sessions_member_client_key",
                columnNames = {"member_id", "client_session_key"}
        ),
        indexes = {
                @Index(
                        name = "idx_walk_sessions_member_ended_id",
                        columnList = "member_id, ended_at, id"
                ),
                @Index(
                        name = "idx_walk_sessions_member_room_ended_id",
                        columnList = "member_id, room_id, ended_at, id"
                )
        }
)
public class WalkSession extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "client_session_key", nullable = false, length = 36)
    private String clientSessionKey;

    @Column(name = "initial_bingo_board_id")
    private Long initialBingoBoardId;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "ended_at", nullable = false)
    private Instant endedAt;

    @Column(nullable = false)
    private int step;

    @Column(nullable = false)
    private int distance;

    @Column(nullable = false)
    private int calories;

    private WalkSession(
            Long memberId,
            Long roomId,
            String clientSessionKey,
            Long initialBingoBoardId,
            Instant startedAt,
            Instant endedAt,
            int step,
            int distance,
            int calories
    ) {
        this.memberId = memberId;
        this.roomId = roomId;
        this.clientSessionKey = clientSessionKey;
        this.initialBingoBoardId = initialBingoBoardId;
        this.startedAt = startedAt;
        this.endedAt = endedAt;
        this.step = step;
        this.distance = distance;
        this.calories = calories;
    }

    public static WalkSession create(
            Long memberId,
            Long roomId,
            String clientSessionKey,
            Long initialBingoBoardId,
            Instant startedAt,
            Instant endedAt,
            int step,
            int distance,
            int calories
    ) {
        return new WalkSession(
                memberId,
                roomId,
                clientSessionKey,
                initialBingoBoardId,
                startedAt,
                endedAt,
                step,
                distance,
                calories
        );
    }

    public long getDurationSeconds() {
        return Duration.between(startedAt, endedAt).toSeconds();
    }
}
