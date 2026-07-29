package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.Room;
import java.util.List;

public record GameResultDetailResponse(
        Long gameId,
        Long roomId,
        GameMode mode,
        boolean result,
        int boardSize,
        Integer targetBingoCount,
        int bingoCount,
        int completedMissionCount,
        long rewardCash,
        List<GameResultParticipantResponse> participants,
        List<GameResultBingoBoardResponse> bingoBoards
) {

    public static GameResultDetailResponse of(
            GameResult gameResult,
            Room room,
            List<GameResultParticipantResponse> participants,
            List<GameResultBingoBoardResponse> bingoBoards
    ) {
        return new GameResultDetailResponse(
                gameResult.getGameId(),
                gameResult.getRoomId(),
                room.getMode(),
                gameResult.isResult(),
                room.getBoardSize(),
                room.getTargetBingoCount(),
                gameResult.getBingoCount(),
                gameResult.getCompletedMissionCount(),
                gameResult.getRewardCash(),
                participants,
                bingoBoards
        );
    }
}
