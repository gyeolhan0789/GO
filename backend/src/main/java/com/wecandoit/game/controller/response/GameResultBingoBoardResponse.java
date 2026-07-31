package com.wecandoit.game.controller.response;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import java.time.LocalDateTime;
import java.util.List;

public record GameResultBingoBoardResponse(
        Long bingoBoardId,
        List<GameResultBoardOwnerResponse> owners,
        int boardSize,
        Integer targetStepCount,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
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
                board.getTargetStepCount(),
                board.getCreatedAt(),
                board.getCompletedAt(),
                board.getStatus(),
                completedBingoCount,
                cells.size(),
                approvedCellCount,
                cells
        );
    }
}
