package com.wecandoit.game.controller.response;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import java.util.List;

public record GameResultBingoBoardResponse(
        Long bingoBoardId,
        List<GameResultBoardOwnerResponse> owners,
        int boardSize,
        BingoBoardStatus status,
        int completedBingoCount,
        int totalCellCount,
        int approvedCellCount,
        List<GameResultBingoCellResponse> cells
) {

    public static GameResultBingoBoardResponse of(
            BingoBoard board,
            List<GameResultBoardOwnerResponse> owners,
            int completedBingoCount,
            int approvedCellCount,
            List<GameResultBingoCellResponse> cells
    ) {
        return new GameResultBingoBoardResponse(
                board.getId(),
                owners,
                board.getBoardSize(),
                board.getStatus(),
                completedBingoCount,
                cells.size(),
                approvedCellCount,
                cells
        );
    }
}
