package com.wecandoit.bingo.domain;

import com.wecandoit.common.entity.BaseEntity;
import com.wecandoit.game.domain.RoomMember;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
        name = "bingo_boards",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_bingo_boards_room_member",
                columnNames = "room_member_id"
        )
)
public class BingoBoard extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id", nullable = false)
    private Long gameId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "room_member_id",
            foreignKey = @ForeignKey(name = "fk_bingo_boards_room_member")
    )
    private RoomMember roomMember;

    @Column(name = "board_size", nullable = false)
    private int boardSize;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BingoBoardStatus status;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    private BingoBoard(Long gameId, int boardSize) {
        this.gameId = gameId;
        this.boardSize = boardSize;
        this.status = BingoBoardStatus.IN_PROGRESS;
    }

    private BingoBoard(Long gameId, RoomMember roomMember, int boardSize) {
        this.gameId = gameId;
        this.roomMember = roomMember;
        this.boardSize = boardSize;
        this.status = BingoBoardStatus.IN_PROGRESS;
    }

    public static BingoBoard create(Long gameId, int boardSize) {
        return new BingoBoard(gameId, boardSize);
    }

    public static BingoBoard createForBattle(Long gameId, RoomMember roomMember, int boardSize) {
        return new BingoBoard(gameId, roomMember, boardSize);
    }

    public void expire() {
        this.status = BingoBoardStatus.EXPIRED;
    }

    public void complete() {
        this.status = BingoBoardStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }
}
