package com.wecandoit.bingo.controller.response;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.GameStatus;
import java.util.List;

public record BingoBoardResponse(
        Long bingoBoardId,
        Long gameId,
        Long roomId,
        int boardSize,
        Integer targetBingoCount,
        Integer targetStepCount,
        int completedBingoCount,
        int totalCellCount,
        int approvedCellCount,
        BingoBoardStatus status,
        List<BingoCellResponse> cells,
        boolean completed,
        boolean canRenew,
        BattleProgressResponse battleProgress
) {

    public static BingoBoardResponse of(
            BingoBoard board,
            Long roomId,
            List<BingoCellResponse> cells,
            Integer targetBingoCount,
            Integer targetStepCount,
            int completedBingoCount,
            int approvedCellCount,
            boolean completed,
            boolean canRenew
    ) {
        return new BingoBoardResponse(
                board.getId(),
                board.getGameId(),
                roomId,
                board.getBoardSize(),
                targetBingoCount,
                targetStepCount,
                completedBingoCount,
                cells.size(),
                approvedCellCount,
                board.getStatus(),
                cells,
                completed,
                canRenew,
                null
        );
    }

    public static BingoBoardResponse ofBattle(
            BingoBoard board,
            Long roomId,
            List<BingoCellResponse> cells,
            Integer targetBingoCount,
            Integer targetStepCount,
            int completedBingoCount,
            int approvedCellCount,
            boolean completed,
            BattleProgressResponse battleProgress
    ) {
        return new BingoBoardResponse(
                board.getId(),
                board.getGameId(),
                roomId,
                board.getBoardSize(),
                targetBingoCount,
                targetStepCount,
                completedBingoCount,
                cells.size(),
                approvedCellCount,
                board.getStatus(),
                cells,
                completed,
                false,
                battleProgress
        );
    }

    public record BattleProgressResponse(
            GameRoomStatus roomStatus,
            GameStatus gameStatus,
            BattleParticipantProgressResponse me,
            BattleParticipantProgressResponse opponent,
            Boolean result
    ) {
    }

    public record BattleParticipantProgressResponse(
            Long memberId,
            Long bingoBoardId,
            int totalCellCount,
            int approvedCellCount,
            int completedBingoCount,
            boolean targetReached
    ) {
    }
}
