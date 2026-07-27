package com.wecandoit.ranking.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.history.repository.MemberHistoryRepository;
import com.wecandoit.history.repository.WeeklyRankingSummary;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.domain.Region;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.ranking.controller.response.RankingItemResponse;
import com.wecandoit.ranking.controller.response.RankingResponse;
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
public class RankingReadService {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    private final MemberRepository memberRepository;
    private final MemberHistoryRepository memberHistoryRepository;

    public RankingResponse getRankings(Long memberId) {
        Member loginMember = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        Region region = loginMember.getRegion();
        if (region == null) {
            throw new CustomException(ErrorCode.MEMBER_REGION_NOT_SET);
        }

        CurrentWeekRange weekRange = CurrentWeekRange.from(LocalDate.now(SERVICE_ZONE_ID));
        List<WeeklyRankingSummary> summaries = memberHistoryRepository.findWeeklyRankingsByRegion(
                region,
                weekRange.startDate(),
                weekRange.endDate()
        );

        return createResponse(region, memberId, summaries);
    }

    private RankingResponse createResponse(
            Region region,
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
        return new RankingResponse(region, myRanking.rank(), myRanking.weeklySteps(), rankings);
    }
}
