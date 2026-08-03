package com.wecandoit.item.domain;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import java.util.Arrays;

public enum ItemCategory {
    HAT,
    TOP,
    BOTTOM,
    SHOES,
    SUNGLASSES,
    ACCESSORY;

    public static ItemCategory from(String category) {
        return Arrays.stream(values())
                .filter(itemCategory -> itemCategory.name().equals(category))
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_ITEM_CATEGORY));
    }
}
