package com.wecandoit.item.controller.response;

import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.MemberItem;

public record MemberItemResponse(
        Long memberItemId,
        Long itemId,
        String name,
        String category,
        String imageUrl
) {

    public static MemberItemResponse of(MemberItem memberItem, Item item) {
        return new MemberItemResponse(
                memberItem.getId(),
                item.getId(),
                item.getName(),
                item.getCategory(),
                item.getImageUrl()
        );
    }
}
