package com.wecandoit.bingo.controller.response;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import java.util.List;

public record BingoBoardResponse(
        Long bingoBoardId,
        Long roomId,
        int boardSize,
        int targetBingoCount,
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
            List<BingoCellResponse> cells,
            int targetBingoCount,
            int completedBingoCount,
            int approvedCellCount,
            boolean completed,
            boolean canRenew
    ) {
        return new BingoBoardResponse(
                board.getId(),
                board.getRoomId(),
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
