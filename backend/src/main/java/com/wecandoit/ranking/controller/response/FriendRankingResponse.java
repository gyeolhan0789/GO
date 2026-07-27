package com.wecandoit.ranking.controller.response;

import java.util.List;

public record FriendRankingResponse(
        int myRank,
        long myWeeklySteps,
        List<RankingItemResponse> rankings
) {
}
