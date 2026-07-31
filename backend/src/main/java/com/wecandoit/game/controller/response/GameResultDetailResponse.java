package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.GameResultParticipant;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomStatus;
import java.time.LocalDateTime;
import java.util.List;

public record GameResultDetailResponse(
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
        long rewardCash,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        int totalMissionCount,
        int myCompletedMissionCount,
        long myRewardCash,
        Boolean myResult,
        List<GameResultParticipantResponse> participants,
        List<GameResultBingoBoardResponse> bingoBoards
) {

    public static GameResultDetailResponse of(
            GameResult gameResult,
            Room room,
            int boardSize,
            int targetBingoCount,
            Integer targetStepCount,
            LocalDateTime startedAt,
            LocalDateTime completedAt,
            int totalMissionCount,
            GameResultParticipant myParticipant,
            List<GameResultParticipantResponse> participants,
            List<GameResultBingoBoardResponse> bingoBoards
    ) {
        return new GameResultDetailResponse(
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
                gameResult.getRewardCash(),
                startedAt,
                completedAt,
                totalMissionCount,
                myParticipant.getCompletedMissionCount(),
                myParticipant.getRewardCash(),
                myParticipant.getResult(),
                participants,
                bingoBoards
        );
    }
}
