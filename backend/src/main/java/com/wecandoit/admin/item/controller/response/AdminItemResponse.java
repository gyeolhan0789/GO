package com.wecandoit.admin.item.controller.response;

import com.wecandoit.item.domain.Item;
import java.time.LocalDateTime;

public record AdminItemResponse(
        Long itemId,
        String name,
        String category,
        long price,
        String imageUrl,
        boolean availableForSale,
        LocalDateTime updatedAt
) {

    public static AdminItemResponse from(Item item) {
        return new AdminItemResponse(
                item.getId(),
                item.getName(),
                item.getCategory(),
                item.getPrice(),
                item.getImageUrl(),
                item.isAvailableForSale(),
                item.getUpdatedAt()
        );
    }
}
