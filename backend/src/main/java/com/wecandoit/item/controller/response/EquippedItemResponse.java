package com.wecandoit.item.controller.response;

import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.domain.MemberEquippedItem;
import com.wecandoit.item.domain.MemberItem;

public record EquippedItemResponse(
        Long memberItemId,
        Long itemId,
        String name,
        ItemCategory category,
        String imageUrl
) {

    public static EquippedItemResponse of(
            MemberEquippedItem equippedItem,
            MemberItem memberItem,
            Item item
    ) {
        return new EquippedItemResponse(
                memberItem.getId(),
                item.getId(),
                item.getName(),
                equippedItem.getCategory(),
                item.getImageUrl()
        );
    }
}
