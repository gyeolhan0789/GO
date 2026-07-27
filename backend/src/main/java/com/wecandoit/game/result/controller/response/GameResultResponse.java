package com.wecandoit.game.result.controller.response;

import com.wecandoit.game.result.domain.GameResult;
import com.wecandoit.game.room.domain.Room;

public record GameResultResponse(
        Long roomId,
        boolean result,
        int boardSize,
        int bingoCount,
        int completedMissionCount,
        long rewardCash
) {

    public static GameResultResponse from(GameResult gameResult, Room room) {
        return new GameResultResponse(
                gameResult.getRoomId(),
                gameResult.isResult(),
                room.getBoardSize(),
                gameResult.getBingoCount(),
                gameResult.getCompletedMissionCount(),
                gameResult.getRewardCash()
        );
    }
}
