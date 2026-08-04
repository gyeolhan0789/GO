package com.wecandoit.bingo.domain;

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
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * {@code (row_index, col_index, board_id)} prevents duplicate coordinates on the same bingo board.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
        name = "bingo_cells",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_bingo_cells_position_board",
                columnNames = {"row_index", "col_index", "board_id"}
        ),
        indexes = @Index(
                name = "idx_bingo_cells_member_client_session_key",
                columnList = "member_id, client_session_key"
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

    @Column(name = "row_index", nullable = false)
    private int row;

    @Column(name = "col_index", nullable = false)
    private int col;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", length = 20)
    private BingoCellVerificationStatus verificationStatus;

    @Column(name = "rejection_reason", length = 255)
    private String rejectionReason;

    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "submit_url", length = 255)
    private String submitUrl;

    @Column(name = "client_session_key", length = 36)
    private String clientSessionKey;

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
        submit(memberId, submitUrl, null);
    }

    public void submit(Long memberId, String submitUrl, String clientSessionKey) {
        this.memberId = memberId;
        this.submitUrl = submitUrl;
        this.clientSessionKey = clientSessionKey;
        this.submittedAt = LocalDateTime.now();
        this.verificationStatus = BingoCellVerificationStatus.PENDING;
        this.rejectionReason = null;
    }

    public void approve() {
        this.verificationStatus = BingoCellVerificationStatus.APPROVED;
        this.rejectionReason = null;
        this.completedAt = LocalDateTime.now();
    }

    public void reject(String rejectionReason) {
        this.verificationStatus = BingoCellVerificationStatus.REJECTED;
        this.rejectionReason = rejectionReason;
        this.completedAt = null;
    }

    public boolean isCompletedBy(LocalDateTime endedAt) {
        return verificationStatus == BingoCellVerificationStatus.APPROVED
                && submittedAt != null
                && !submittedAt.isAfter(endedAt);
    }
}
