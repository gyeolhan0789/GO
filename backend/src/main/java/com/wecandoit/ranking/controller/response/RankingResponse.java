package com.wecandoit.ranking.controller.response;

import com.wecandoit.common.response.PageResponse;
import com.wecandoit.member.domain.Region;

public record RankingResponse(
        Region region,
        int myRank,
        long myWeeklySteps,
        PageResponse<RankingItemResponse> rankings
) {
}
