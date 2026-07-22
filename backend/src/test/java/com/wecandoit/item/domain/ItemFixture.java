package com.wecandoit.item.domain;

import org.springframework.test.util.ReflectionTestUtils;

public final class ItemFixture {

    private ItemFixture() {
    }

    public static Item item(
            String name,
            String category,
            long price,
            String imageUrl
    ) {
        Item item = new Item();
        ReflectionTestUtils.setField(item, "name", name);
        ReflectionTestUtils.setField(item, "category", category);
        ReflectionTestUtils.setField(item, "price", price);
        ReflectionTestUtils.setField(item, "imageUrl", imageUrl);
        return item;
    }
}
