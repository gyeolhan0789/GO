package com.wecandoit.ranking.controller.response;

import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.member.domain.Gender;
import java.util.List;

public record RankingItemResponse(
        int rank,
        Long memberId,
        String nickname,
        long weeklySteps,
        Gender gender,
        String defaultImageUrl,
        List<EquippedItemResponse> equippedItems
) {
}
