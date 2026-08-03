package com.wecandoit.item.controller.response;

import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.ItemCategory;

public record ShopItemResponse(
        Long itemId,
        String name,
        ItemCategory category,
        long price,
        String imageUrl
) {

    public static ShopItemResponse from(Item item) {
        return new ShopItemResponse(
                item.getId(),
                item.getName(),
                item.getCategory(),
                item.getPrice(),
                item.getImageUrl()
        );
    }
}
