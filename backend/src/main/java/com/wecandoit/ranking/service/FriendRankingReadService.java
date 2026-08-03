package com.wecandoit.ranking.service;

import com.wecandoit.avatar.service.AvatarReadService;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.PageResponse;
import com.wecandoit.history.repository.MemberHistoryRepository;
import com.wecandoit.history.repository.RankedWeeklyRankingSummary;
import com.wecandoit.item.controller.response.AvatarResponse;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.ranking.controller.response.FriendRankingResponse;
import com.wecandoit.ranking.controller.response.RankingItemResponse;
import java.time.LocalDate;
import java.time.ZoneId;
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
public class FriendRankingReadService {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    private final MemberHistoryRepository memberHistoryRepository;
    private final MemberRepository memberRepository;
    private final AvatarReadService avatarReadService;

    public FriendRankingResponse getFriendRankings(Long memberId, Pageable pageable) {
        CurrentWeekRange weekRange = CurrentWeekRange.from(LocalDate.now(SERVICE_ZONE_ID));
        Pageable fixedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Page<RankedWeeklyRankingSummary> summaries =
                memberHistoryRepository.findPagedWeeklyFriendRankings(
                        memberId,
                        weekRange.startDate(),
                        weekRange.endDate(),
                        fixedPageable
                );
        RankedWeeklyRankingSummary myRanking =
                memberHistoryRepository.findWeeklyFriendRankingByMemberId(
                                memberId,
                                weekRange.startDate(),
                                weekRange.endDate()
                        )
                        .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        List<Long> rankingMemberIds = summaries.stream()
                .map(RankedWeeklyRankingSummary::getMemberId)
                .toList();
        List<Member> rankingMembers = memberRepository.findAllById(rankingMemberIds);
        Map<Long, AvatarResponse> avatarsByMemberId = avatarReadService.getAvatars(rankingMembers);

        return new FriendRankingResponse(
                myRanking.getRanking(),
                myRanking.getWeeklySteps(),
                PageResponse.from(summaries.map(summary ->
                        toRankingItemResponse(summary, avatarsByMemberId)))
        );
    }

    private static RankingItemResponse toRankingItemResponse(
            RankedWeeklyRankingSummary summary,
            Map<Long, AvatarResponse> avatarsByMemberId
    ) {
        AvatarResponse avatar = avatarsByMemberId.get(summary.getMemberId());
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
