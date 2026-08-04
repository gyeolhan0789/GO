package com.wecandoit.ranking.service;

import com.wecandoit.avatar.service.AvatarReadService;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.PageResponse;
import com.wecandoit.history.repository.MemberHistoryRepository;
import com.wecandoit.history.repository.RankedWeeklyRankingSummary;
import com.wecandoit.avatar.dto.AvatarDto;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.domain.Region;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.ranking.controller.response.FriendRankingResponse;
import com.wecandoit.ranking.controller.response.RankingItemResponse;
import com.wecandoit.ranking.controller.response.RankingResponse;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
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
    private final AvatarReadService avatarReadService;

    public RankingResponse getRankings(Long memberId, Pageable pageable) {
        Member loginMember = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        Region region = loginMember.getRegion();
        if (region == null) {
            throw new CustomException(ErrorCode.MEMBER_REGION_NOT_SET);
        }

        LocalDate today = LocalDate.now(SERVICE_ZONE_ID);
        LocalDate weekStartDate = currentWeekStartDate(today);
        Pageable fixedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Page<RankedWeeklyRankingSummary> summaries =
                memberHistoryRepository.findPagedWeeklyRankingsByRegion(
                        region.name(),
                        weekStartDate,
                        today,
                        fixedPageable
                );
        RankedWeeklyRankingSummary myRanking =
                memberHistoryRepository.findWeeklyRankingByRegionAndMemberId(
                                region.name(),
                                memberId,
                                weekStartDate,
                                today
                        )
                        .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        List<Long> rankingMemberIds = summaries.stream()
                .map(RankedWeeklyRankingSummary::getMemberId)
                .toList();
        List<Member> rankingMembers = new ArrayList<>(memberRepository.findAllById(
                rankingMemberIds.stream()
                        .filter(rankingMemberId -> !rankingMemberId.equals(memberId))
                        .toList()
        ));
        if (rankingMemberIds.contains(memberId)) {
            rankingMembers.add(loginMember);
        }
        Map<Long, AvatarDto> avatarsByMemberId = avatarReadService.getAvatars(rankingMembers);

        return new RankingResponse(
                region,
                myRanking.getRanking(),
                myRanking.getWeeklySteps(),
                PageResponse.from(summaries.map(summary ->
                        toRankingItemResponse(summary, avatarsByMemberId)))
        );
    }

    public FriendRankingResponse getFriendRankings(Long memberId, Pageable pageable) {
        LocalDate today = LocalDate.now(SERVICE_ZONE_ID);
        LocalDate weekStartDate = currentWeekStartDate(today);
        Pageable fixedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Page<RankedWeeklyRankingSummary> summaries =
                memberHistoryRepository.findPagedWeeklyFriendRankings(
                        memberId,
                        weekStartDate,
                        today,
                        fixedPageable
                );
        RankedWeeklyRankingSummary myRanking =
                memberHistoryRepository.findWeeklyFriendRankingByMemberId(
                                memberId,
                                weekStartDate,
                                today
                        )
                        .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        List<Long> rankingMemberIds = summaries.stream()
                .map(RankedWeeklyRankingSummary::getMemberId)
                .toList();
        List<Member> rankingMembers = memberRepository.findAllById(rankingMemberIds);
        Map<Long, AvatarDto> avatarsByMemberId = avatarReadService.getAvatars(rankingMembers);

        return new FriendRankingResponse(
                myRanking.getRanking(),
                myRanking.getWeeklySteps(),
                PageResponse.from(summaries.map(summary ->
                        toRankingItemResponse(summary, avatarsByMemberId)))
        );
    }

    static LocalDate currentWeekStartDate(LocalDate currentDate) {
        return currentDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    private static RankingItemResponse toRankingItemResponse(
            RankedWeeklyRankingSummary summary,
            Map<Long, AvatarDto> avatarsByMemberId
    ) {
        AvatarDto avatar = avatarsByMemberId.get(summary.getMemberId());
        if (avatar == null) {
            throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        }
        return new RankingItemResponse(
                summary.getRanking(),
                summary.getMemberId(),
                summary.getNickname(),
                summary.getWeeklySteps(),
                avatar.gender(),
                avatar.defaultImageUrl(),
                avatar.equippedItems()
        );
    }
}
