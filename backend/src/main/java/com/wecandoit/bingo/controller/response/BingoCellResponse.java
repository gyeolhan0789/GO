package com.wecandoit.bingo.controller.response;

import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.mission.controller.response.MissionResponse;
import com.wecandoit.mission.domain.Mission;

public record BingoCellResponse(
        Long cellId,
        int row,
        int col,
        MissionResponse mission,
        BingoCellVerificationStatus verificationStatus,
        Long submittedByMemberId,
        String rejectionReason
) {

    public static BingoCellResponse of(BingoCell cell, Mission mission) {
        return new BingoCellResponse(
                cell.getId(),
                cell.getRow(),
                cell.getCol(),
                MissionResponse.from(mission),
                cell.getVerificationStatus(),
                cell.getMemberId(),
                cell.getRejectionReason()
        );
    }
}
