package com.wecandoit.bingo.controller.response;

import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.mission.controller.response.MissionResponse;
import com.wecandoit.mission.domain.Mission;

public record BingoCellSubmitResponse(
        Long cellId,
        int row,
        int col,
        MissionResponse mission,
        BingoCellVerificationStatus verificationStatus,
        Long submittedByMemberId,
        String rejectionReason,
        long rewardCash
) {

    public static BingoCellSubmitResponse of(BingoCell cell, Mission mission, long rewardCash) {
        return new BingoCellSubmitResponse(
                cell.getId(),
                cell.getRow(),
                cell.getCol(),
                MissionResponse.from(mission),
                cell.getVerificationStatus(),
                cell.getMemberId(),
                cell.getRejectionReason(),
                rewardCash
        );
    }
}
