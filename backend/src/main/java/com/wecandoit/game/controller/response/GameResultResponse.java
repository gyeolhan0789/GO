package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.Room;
import java.util.List;

public record GameResultResponse(
        Long gameId,
        Long roomId,
        GameMode mode,
        boolean result,
        int boardSize,
        int targetBingoCount,
        int bingoCount,
        int completedMissionCount,
        long rewardCash,
        List<GameResultParticipantResponse> participants
) {

    public static GameResultResponse of(
            GameResult gameResult,
            Room room,
            List<GameResultParticipantResponse> participants
    ) {
        return new GameResultResponse(
                gameResult.getGameId(),
                gameResult.getRoomId(),
                room.getMode(),
                gameResult.isResult(),
                room.getBoardSize(),
                room.getTargetBingoCount(),
                gameResult.getBingoCount(),
                gameResult.getCompletedMissionCount(),
                gameResult.getRewardCash(),
                participants
        );
    }
}
