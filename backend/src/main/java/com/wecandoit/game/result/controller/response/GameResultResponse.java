package com.wecandoit.game.result.controller.response;

import com.wecandoit.game.result.domain.GameResult;

public record GameResultResponse(
        Long roomId,
        boolean result,
        int bingoCount,
        int completedMissionCount,
        long rewardCash
) {

    public static GameResultResponse from(GameResult gameResult) {
        return new GameResultResponse(
                gameResult.getRoomId(),
                gameResult.isResult(),
                gameResult.getBingoCount(),
                gameResult.getCompletedMissionCount(),
                gameResult.getRewardCash()
        );
    }
}
