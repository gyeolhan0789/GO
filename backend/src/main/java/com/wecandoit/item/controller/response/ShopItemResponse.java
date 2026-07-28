package com.wecandoit.item.controller.response;

import com.wecandoit.item.domain.Item;

public record ShopItemResponse(
        Long itemId,
        String name,
        String category,
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
