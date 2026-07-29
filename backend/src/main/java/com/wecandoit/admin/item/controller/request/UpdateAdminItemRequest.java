package com.wecandoit.admin.item.controller.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record UpdateAdminItemRequest(
        @NotBlank(message = "아이템 이름은 필수입니다.")
        @Size(max = 100, message = "아이템 이름은 100자 이하여야 합니다.")
        String name,

        @NotBlank(message = "아이템 카테고리는 필수입니다.")
        String category,

        @NotNull(message = "아이템 가격은 필수입니다.")
        @PositiveOrZero(message = "아이템 가격은 0 이상이어야 합니다.")
        Long price,

        @NotNull(message = "판매 가능 여부는 필수입니다.")
        Boolean availableForSale
) {
}
