package com.wecandoit.avatar.dto;

import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.domain.MemberEquippedItem;
import com.wecandoit.item.domain.MemberItem;

public record EquippedItemDto(
        Long memberItemId,
        Long itemId,
        String name,
        ItemCategory category,
        String imageUrl
) {

    public static EquippedItemDto of(
            MemberEquippedItem equippedItem,
            MemberItem memberItem,
            Item item
    ) {
        return new EquippedItemDto(
                memberItem.getId(),
                item.getId(),
                item.getName(),
                equippedItem.getCategory(),
                item.getImageUrl()
        );
    }
}
