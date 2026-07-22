package com.wecandoit.bingo.controller.response;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import java.util.List;

public record BingoBoardResponse(
        Long bingoBoardId,
        Long roomId,
        int boardSize,
        BingoBoardStatus status,
        List<BingoCellResponse> cells,
        boolean completed,
        boolean canRenew
) {

    public static BingoBoardResponse of(BingoBoard board, List<BingoCellResponse> cells) {
        return of(board, cells, false, false);
    }

    public static BingoBoardResponse of(BingoBoard board, List<BingoCellResponse> cells, boolean completed, boolean canRenew) {
        return new BingoBoardResponse(
                board.getId(),
                board.getRoomId(),
                board.getBoardSize(),
                board.getStatus(),
                cells,
                completed,
                canRenew
        );
    }
}
