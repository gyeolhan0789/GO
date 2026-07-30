package com.wecandoit.ranking.controller.response;

import com.wecandoit.item.controller.response.EquippedItemResponse;
import java.util.List;

public record RankingItemResponse(
        int rank,
        Long memberId,
        String nickname,
        long weeklySteps,
        List<EquippedItemResponse> equippedItems
) {
}
