package com.wecandoit.history.controller.response;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoBoardType;
import java.time.Instant;
import java.util.List;

public record WalkSessionBingoBoardResponse(
        Long bingoBoardId,
        Long gameId,
        BingoBoardType boardType,
        int boardSize,
        Integer targetBingoCount,
        Integer targetStepCount,
        BingoBoardStatus status,
        Instant createdAt,
        Instant completedAt,
        List<WalkSessionBingoCellResponse> cells
) {

    public static WalkSessionBingoBoardResponse of(
            BingoBoard board,
            Instant createdAt,
            Instant completedAt,
            List<WalkSessionBingoCellResponse> cells
    ) {
        return new WalkSessionBingoBoardResponse(
                board.getId(),
                board.getGameId(),
                board.getType(),
                board.getBoardSize(),
                board.getTargetBingoCount(),
                board.getTargetStepCount(),
                board.getStatus(),
                createdAt,
                completedAt,
                cells
        );
    }
}
