package com.wecandoit.point.controller.response;

import com.wecandoit.point.domain.PointHistory;
import com.wecandoit.point.domain.PointHistoryType;
import java.time.LocalDateTime;

public record PointHistoryResponse(
        Long pointHistoryId,
        PointHistoryType type,
        long amount,
        LocalDateTime occurredAt,
        Long roomId,
        Long gameId,
        Long bingoCellId,
        Long bingoBoardId,
        Long itemId,
        String itemName
) {

    public static PointHistoryResponse from(PointHistory pointHistory) {
        Long roomId = switch (pointHistory.getType()) {
            case GAME_GOAL_REWARD, BINGO_CELL_REWARD ->
                    pointHistory.getRoomId() != null ? pointHistory.getRoomId() : pointHistory.getReferenceId();
            case DAILY_STEP_GOAL_REWARD -> pointHistory.getRoomId();
            case ITEM_PURCHASE -> null;
        };
        Long gameId = pointHistory.getType() == PointHistoryType.GAME_GOAL_REWARD
                ? pointHistory.getRoomId() != null ? pointHistory.getReferenceId() : null
                : null;
        Long bingoCellId = pointHistory.getType() == PointHistoryType.BINGO_CELL_REWARD
                ? pointHistory.getReferenceId()
                : null;
        Long bingoBoardId = pointHistory.getType() == PointHistoryType.DAILY_STEP_GOAL_REWARD
                ? pointHistory.getReferenceId()
                : null;
        Long itemId = pointHistory.getType() == PointHistoryType.ITEM_PURCHASE
                ? pointHistory.getReferenceId()
                : null;
        return new PointHistoryResponse(
                pointHistory.getId(),
                pointHistory.getType(),
                pointHistory.getAmount(),
                pointHistory.getCreatedAt(),
                roomId,
                gameId,
                bingoCellId,
                bingoBoardId,
                itemId,
                pointHistory.getItemName()
        );
    }
}
