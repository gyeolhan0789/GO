package com.wecandoit.item.domain;

import org.springframework.test.util.ReflectionTestUtils;

public final class ItemFixture {

    private ItemFixture() {
    }

    public static Item item(Long id, String category) {
        Item item = new Item();
        ReflectionTestUtils.setField(item, "id", id);
        ReflectionTestUtils.setField(item, "category", category);
        return item;
    }

    public static Item item(
            Long id,
            String name,
            String category,
            String imageUrl
    ) {
        Item item = item(name, category, 0L, imageUrl);
        ReflectionTestUtils.setField(item, "id", id);
        return item;
    }

    public static Item item(
            String name,
            String category,
            long price,
            String imageUrl
    ) {
        return Item.create(name, category, price, imageUrl);
    }
}
