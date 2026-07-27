package com.wecandoit.ranking.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.history.repository.MemberHistoryRepository;
import com.wecandoit.history.repository.WeeklyRankingSummary;
import com.wecandoit.ranking.controller.response.FriendRankingResponse;
import com.wecandoit.ranking.controller.response.RankingItemResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FriendRankingReadService {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    private final MemberHistoryRepository memberHistoryRepository;

    public FriendRankingResponse getFriendRankings(Long memberId) {
        CurrentWeekRange weekRange = CurrentWeekRange.from(LocalDate.now(SERVICE_ZONE_ID));
        List<WeeklyRankingSummary> summaries = memberHistoryRepository.findWeeklyFriendRankings(
                memberId,
                weekRange.startDate(),
                weekRange.endDate()
        );

        return createResponse(memberId, summaries);
    }

    private FriendRankingResponse createResponse(
            Long loginMemberId,
            List<WeeklyRankingSummary> summaries
    ) {
        List<RankingItemResponse> rankings = new ArrayList<>(summaries.size());
        int previousRank = 0;
        long previousWeeklySteps = -1;
        RankingItemResponse myRanking = null;

        for (int index = 0; index < summaries.size(); index++) {
            WeeklyRankingSummary summary = summaries.get(index);
            if (summary.getWeeklySteps() != previousWeeklySteps) {
                previousRank = index + 1;
                previousWeeklySteps = summary.getWeeklySteps();
            }

            RankingItemResponse ranking = new RankingItemResponse(
                    previousRank,
                    summary.getMemberId(),
                    summary.getNickname(),
                    summary.getWeeklySteps()
            );
            rankings.add(ranking);
            if (summary.getMemberId().equals(loginMemberId)) {
                myRanking = ranking;
            }
        }

        if (myRanking == null) {
            throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        }
        return new FriendRankingResponse(myRanking.rank(), myRanking.weeklySteps(), rankings);
    }
}
