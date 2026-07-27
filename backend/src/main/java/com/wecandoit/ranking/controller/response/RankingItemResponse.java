package com.wecandoit.ranking.controller.response;

public record RankingItemResponse(
        int rank,
        Long memberId,
        String nickname,
        long weeklySteps
) {
}
