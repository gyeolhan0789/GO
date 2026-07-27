package com.wecandoit.ranking.controller.response;

import com.wecandoit.member.domain.Region;
import java.util.List;

public record RankingResponse(
        Region region,
        int myRank,
        long myWeeklySteps,
        List<RankingItemResponse> rankings
) {
}
