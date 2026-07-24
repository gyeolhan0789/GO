package com.wecandoit.cash.controller.response;

import com.wecandoit.cash.domain.CashHistory;
import com.wecandoit.cash.domain.CashHistoryType;
import java.time.LocalDateTime;

public record CashHistoryResponse(
        Long cashHistoryId,
        CashHistoryType type,
        long amount,
        LocalDateTime occurredAt,
        Long roomId,
        Long itemId,
        String itemName
) {

    public static CashHistoryResponse from(CashHistory cashHistory) {
        Long roomId = cashHistory.getType() == CashHistoryType.BINGO_REWARD
                ? cashHistory.getReferenceId()
                : null;
        Long itemId = cashHistory.getType() == CashHistoryType.ITEM_PURCHASE
                ? cashHistory.getReferenceId()
                : null;
        return new CashHistoryResponse(
                cashHistory.getId(),
                cashHistory.getType(),
                cashHistory.getAmount(),
                cashHistory.getCreatedAt(),
                roomId,
                itemId,
                cashHistory.getItemName()
        );
    }
}
