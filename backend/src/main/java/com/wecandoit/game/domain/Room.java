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
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "rooms")
public class Room extends BaseEntity {

    public static final int NAME_MAX_LENGTH = 20;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = NAME_MAX_LENGTH)
    private String name;

    @Column(name = "host_id", nullable = false)
    private Long hostId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private GameMode mode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RoomStatus status;

    @Column(name = "target_bingo_count")
    private Integer targetBingoCount;

    @Column(name = "target_step_count")
    private Integer targetStepCount;

    @Column(name = "board_size", nullable = false)
    private int boardSize;

    private Room(
            Long hostId,
            String name,
            GameMode mode,
            Integer targetBingoCount,
            Integer targetStepCount,
            int boardSize
    ) {
        this.hostId = hostId;
        this.name = name.strip();
        this.mode = mode;
        this.status = RoomStatus.ACTIVE;
        this.targetBingoCount = targetBingoCount;
        this.targetStepCount = targetStepCount;
        this.boardSize = boardSize;
    }

    public static Room create(
            Long hostId,
            String name,
            GameMode mode,
            Integer targetBingoCount,
            int boardSize
    ) {
        return create(hostId, name, mode, targetBingoCount, null, boardSize);
    }

    public static Room create(
            Long hostId,
            String name,
            GameMode mode,
            Integer targetBingoCount,
            Integer targetStepCount,
            int boardSize
    ) {
        return new Room(hostId, name, mode, targetBingoCount, targetStepCount, boardSize);
    }

    public boolean isHost(Long memberId) {
        return hostId.equals(memberId);
    }

    public boolean isActive() {
        return status == RoomStatus.ACTIVE;
    }

    public boolean isClosed() {
        return status == RoomStatus.CLOSED;
    }

    public void updateName(String name) {
        this.name = name;
    }

    public void close() {
        this.status = RoomStatus.CLOSED;
    }
}
