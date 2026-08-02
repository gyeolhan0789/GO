package com.wecandoit.bingo.event;

import com.wecandoit.bingo.domain.BingoCellVerificationStatus;

public record CooperativeBingoProgressUpdatedEvent(
        Long roomId,
        Long bingoBoardId,
        Long cellId,
        BingoCellVerificationStatus verificationStatus,
        Long submittedByMemberId,
        String rejectionReason,
        int approvedCellCount,
        int completedBingoCount
) {
}
