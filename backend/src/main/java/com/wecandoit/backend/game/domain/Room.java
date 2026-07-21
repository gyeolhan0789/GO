package com.wecandoit.backend.game.domain;

import com.wecandoit.backend.common.entity.BaseEntity;
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

    @Column(nullable = false, length = 30)
    private String mode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private GameRoomStatus status;

    @Column(name = "target_bingo_count", nullable = false)
    private int targetBingoCount;

    @Column(name = "started_at")
    private LocalDateTime startedAt;
}
