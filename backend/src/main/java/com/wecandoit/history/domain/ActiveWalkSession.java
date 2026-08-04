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
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
        name = "active_walk_sessions",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_active_walk_sessions_member",
                        columnNames = "member_id"
                ),
                @UniqueConstraint(
                        name = "uk_active_walk_sessions_key",
                        columnNames = "walk_session_key"
                )
        },
        indexes = {
                @Index(
                        name = "idx_active_walk_sessions_expires_at",
                        columnList = "expires_at"
                )
        }
)
public class ActiveWalkSession extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "walk_session_key", nullable = false, length = 36)
    private String walkSessionKey;

    @Column(name = "initial_bingo_board_id")
    private Long initialBingoBoardId;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    private ActiveWalkSession(
            Long memberId,
            Long roomId,
            String walkSessionKey,
            Long initialBingoBoardId,
            Instant startedAt,
            Instant expiresAt
    ) {
        this.memberId = memberId;
        this.roomId = roomId;
        this.walkSessionKey = walkSessionKey;
        this.initialBingoBoardId = initialBingoBoardId;
        this.startedAt = startedAt;
        this.expiresAt = expiresAt;
    }

    public static ActiveWalkSession create(
            Long memberId,
            Long roomId,
            String walkSessionKey,
            Long initialBingoBoardId,
            Instant startedAt,
            Instant expiresAt
    ) {
        return new ActiveWalkSession(
                memberId,
                roomId,
                walkSessionKey,
                initialBingoBoardId,
                startedAt,
                expiresAt
        );
    }

    public boolean isExpired(Instant now) {
        return !expiresAt.isAfter(now);
    }
}
