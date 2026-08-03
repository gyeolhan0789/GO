package com.wecandoit.item.controller.response;

import com.wecandoit.item.domain.MemberItem;

public record ItemPurchaseResponse(
        Long memberItemId,
        Long itemId,
        long remainingPoint
) {

    public static ItemPurchaseResponse of(MemberItem memberItem, long remainingPoint) {
        return new ItemPurchaseResponse(
                memberItem.getId(),
                memberItem.getItemId(),
                remainingPoint
        );
    }
}
