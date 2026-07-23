package com.wecandoit.item.controller.response;

import com.wecandoit.item.domain.MemberItem;

public record ItemPurchaseResponse(
        Long memberItemId,
        Long itemId,
        long remainingCash
) {

    public static ItemPurchaseResponse of(MemberItem memberItem, long remainingCash) {
        return new ItemPurchaseResponse(
                memberItem.getId(),
                memberItem.getItemId(),
                remainingCash
        );
    }
}
