package com.wecandoit.history.controller.response;

import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.mission.controller.response.MissionResponse;
import com.wecandoit.mission.domain.Mission;
import java.time.Instant;

public record WalkSessionBingoCellResponse(
        Long cellId,
        int row,
        int col,
        MissionResponse mission,
        BingoCellVerificationStatus verificationStatus,
        Long submittedByMemberId,
        String rejectionReason,
        boolean achievedInSession,
        Instant achievedAt
) {

    public static WalkSessionBingoCellResponse of(
            BingoCell cell,
            Mission mission,
            Instant achievedAt
    ) {
        return new WalkSessionBingoCellResponse(
                cell.getId(),
                cell.getRow(),
                cell.getCol(),
                MissionResponse.from(mission),
                cell.getVerificationStatus(),
                cell.getMemberId(),
                cell.getRejectionReason(),
                achievedAt != null,
                achievedAt
        );
    }
}
