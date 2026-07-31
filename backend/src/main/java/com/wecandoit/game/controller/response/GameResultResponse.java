package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.GameResultParticipant;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.Room;
import java.time.LocalDateTime;
import java.util.List;

public record GameResultResponse(
        Long gameId,
        Long roomId,
        String roomName,
        GameMode mode,
        GameRoomStatus roomStatus,
        boolean result,
        int boardSize,
        Integer targetBingoCount,
        Integer targetStepCount,
        int bingoCount,
        int completedMissionCount,
        long rewardCash,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        int totalMissionCount,
        int myCompletedMissionCount,
        long myRewardCash,
        Boolean myResult,
        List<GameResultParticipantResponse> participants
) {

    public static GameResultResponse of(
            GameResult gameResult,
            Room room,
            Integer targetStepCount,
            LocalDateTime startedAt,
            LocalDateTime completedAt,
            int totalMissionCount,
            GameResultParticipant myParticipant,
            List<GameResultParticipantResponse> participants
    ) {
        return new GameResultResponse(
                gameResult.getGameId(),
                gameResult.getRoomId(),
                room.getName(),
                room.getMode(),
                room.getStatus(),
                gameResult.isResult(),
                room.getBoardSize(),
                room.getTargetBingoCount(),
                targetStepCount,
                gameResult.getBingoCount(),
                gameResult.getCompletedMissionCount(),
                gameResult.getRewardCash(),
                startedAt,
                completedAt,
                totalMissionCount,
                myParticipant.getCompletedMissionCount(),
                myParticipant.getRewardCash(),
                myParticipant.getResult(),
                participants
        );
    }
}
