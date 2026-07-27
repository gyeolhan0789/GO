package com.wecandoit.ranking.controller.response;

import com.wecandoit.common.response.PageResponse;

public record FriendRankingResponse(
        int myRank,
        long myWeeklySteps,
        PageResponse<RankingItemResponse> rankings
) {
}
