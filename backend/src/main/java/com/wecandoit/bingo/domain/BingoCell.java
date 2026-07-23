package com.wecandoit.bingo.domain;

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

/**
 * {@code (row, col, board_id)} prevents duplicate coordinates on the same bingo board.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
        name = "bingo_cells",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_bingo_cells_position_board",
                columnNames = {"row", "col", "board_id"}
        )
)
public class BingoCell extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "board_id", nullable = false)
    private Long boardId;

    @Column(name = "mission_id", nullable = false)
    private Long missionId;

    @Column(name = "row", nullable = false)
    private int row;

    @Column(name = "col", nullable = false)
    private int col;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "submit_url", length = 255)
    private String submitUrl;

    private BingoCell(Long boardId, Long missionId, int row, int col) {
        this.boardId = boardId;
        this.missionId = missionId;
        this.row = row;
        this.col = col;
    }

    public static BingoCell create(Long boardId, Long missionId, int row, int col) {
        return new BingoCell(boardId, missionId, row, col);
    }

    public void submit(Long memberId, String submitUrl) {
        this.memberId = memberId;
        this.submitUrl = submitUrl;
    }
}
