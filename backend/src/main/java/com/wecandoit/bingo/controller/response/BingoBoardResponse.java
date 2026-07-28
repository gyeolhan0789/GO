package com.wecandoit.bingo.controller.response;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import java.util.List;

public record BingoBoardResponse(
        Long bingoBoardId,
        Long gameId,
        Long roomId,
        int boardSize,
        Integer targetBingoCount,
        int completedBingoCount,
        int totalCellCount,
        int approvedCellCount,
        BingoBoardStatus status,
        List<BingoCellResponse> cells,
        boolean completed,
        boolean canRenew
) {

    public static BingoBoardResponse of(
            BingoBoard board,
            Long roomId,
            List<BingoCellResponse> cells,
            Integer targetBingoCount,
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
                completedBingoCount,
                cells.size(),
                approvedCellCount,
                board.getStatus(),
                cells,
                completed,
                canRenew
        );
    }
}
