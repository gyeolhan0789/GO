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

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "board_size", nullable = false)
    private int boardSize;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BingoBoardStatus status;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    private BingoBoard(Long roomId, int boardSize) {
        this.roomId = roomId;
        this.boardSize = boardSize;
        this.status = BingoBoardStatus.CREATED;
    }

    public static BingoBoard create(Long roomId, int boardSize) {
        return new BingoBoard(roomId, boardSize);
    }

    public void close() {
        this.status = BingoBoardStatus.CLOSED;
    }

    public void complete() {
        this.status = BingoBoardStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }
}
