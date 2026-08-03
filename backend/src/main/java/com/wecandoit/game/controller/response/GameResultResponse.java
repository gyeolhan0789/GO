package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.GameResultParticipant;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomStatus;
import java.time.LocalDateTime;
import java.util.List;

public record GameResultResponse(
        Long gameId,
        Long roomId,
        String roomName,
        GameMode mode,
        RoomStatus roomStatus,
        boolean result,
        int boardSize,
        Integer targetBingoCount,
        Integer targetStepCount,
        int bingoCount,
        int completedMissionCount,
        long rewardPoint,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        int totalMissionCount,
        int myCompletedMissionCount,
        long myRewardPoint,
        Boolean myResult,
        List<GameResultParticipantResponse> participants
) {

    public static GameResultResponse of(
            GameResult gameResult,
            Room room,
            int boardSize,
            Integer targetBingoCount,
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
                boardSize,
                targetBingoCount,
                targetStepCount,
                gameResult.getBingoCount(),
                gameResult.getCompletedMissionCount(),
                gameResult.getRewardPoint(),
                startedAt,
                completedAt,
                totalMissionCount,
                myParticipant.getCompletedMissionCount(),
                myParticipant.getRewardPoint(),
                myParticipant.getResult(),
                participants
        );
    }
}
