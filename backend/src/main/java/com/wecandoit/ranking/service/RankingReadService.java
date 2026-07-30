package com.wecandoit.ranking.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.PageResponse;
import com.wecandoit.history.repository.MemberHistoryRepository;
import com.wecandoit.history.repository.RankedWeeklyRankingSummary;
import com.wecandoit.item.controller.response.CharacterResponse;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.domain.Region;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.ranking.controller.response.RankingItemResponse;
import com.wecandoit.ranking.controller.response.RankingResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RankingReadService {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    private final MemberRepository memberRepository;
    private final MemberHistoryRepository memberHistoryRepository;
    private final RankingCharacterReadService rankingCharacterReadService;

    public RankingResponse getRankings(Long memberId, Pageable pageable) {
        Member loginMember = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        Region region = loginMember.getRegion();
        if (region == null) {
            throw new CustomException(ErrorCode.MEMBER_REGION_NOT_SET);
        }

        CurrentWeekRange weekRange = CurrentWeekRange.from(LocalDate.now(SERVICE_ZONE_ID));
        Pageable fixedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Page<RankedWeeklyRankingSummary> summaries =
                memberHistoryRepository.findPagedWeeklyRankingsByRegion(
                        region.name(),
                        weekRange.startDate(),
                        weekRange.endDate(),
                        fixedPageable
                );
        RankedWeeklyRankingSummary myRanking =
                memberHistoryRepository.findWeeklyRankingByRegionAndMemberId(
                                region.name(),
                                memberId,
                                weekRange.startDate(),
                                weekRange.endDate()
                        )
                        .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        Map<Long, CharacterResponse> charactersByMemberId =
                rankingCharacterReadService.getCharactersByMemberIds(
                        summaries.stream()
                                .map(RankedWeeklyRankingSummary::getMemberId)
                                .toList()
                );

        return new RankingResponse(
                region,
                myRanking.getRanking(),
                myRanking.getWeeklySteps(),
                PageResponse.from(summaries.map(summary ->
                        toRankingItemResponse(summary, charactersByMemberId)))
        );
    }

    private static RankingItemResponse toRankingItemResponse(
            RankedWeeklyRankingSummary summary,
            Map<Long, CharacterResponse> charactersByMemberId
    ) {
        CharacterResponse character = charactersByMemberId.get(summary.getMemberId());
        if (character == null) {
            throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        }
        return new RankingItemResponse(
                summary.getRanking(),
                summary.getMemberId(),
                summary.getNickname(),
                summary.getWeeklySteps(),
                character.gender(),
                character.defaultImageUrl(),
                character.equippedItems()
        );
    }
}
