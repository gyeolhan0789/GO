package com.wecandoit.item.controller.request;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SaveEquippedItemsRequest(
        @NotNull(message = "보유 아이템 ID 목록은 필수입니다.")
        List<@NotNull(message = "보유 아이템 ID는 필수입니다.") Long> memberItemIds
) {
}
