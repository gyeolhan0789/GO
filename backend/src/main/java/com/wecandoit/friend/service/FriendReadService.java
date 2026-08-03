package com.wecandoit.friend.service;

import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.friend.domain.Friend;
import com.wecandoit.friend.dto.FriendResponse;
import com.wecandoit.friend.repository.FriendRepository;
import com.wecandoit.history.domain.HistoryPeriod;
import com.wecandoit.history.repository.MemberHistoryRepository;
import com.wecandoit.history.repository.WeeklyRankingSummary;
import com.wecandoit.item.controller.response.CharacterResponse;
import com.wecandoit.member.domain.Member;
import com.wecandoit.ranking.service.RankingCharacterReadService;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FriendReadService {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    private final FriendRepository friendRepository;
    private final MemberHistoryRepository memberHistoryRepository;
    private final RankingCharacterReadService rankingCharacterReadService;

    public SliceResponse<FriendResponse> getFriends(Long memberId, Pageable pageable) {
        Pageable fixedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Slice<Friend> friends = friendRepository.findAllByMemberId(memberId, fixedPageable);
        if (friends.isEmpty()) {
            return new SliceResponse<>(List.of(), false);
        }

        List<Member> friendMembers = friends.stream()
                .map(friend -> friend.getFriendOf(memberId))
                .toList();
        List<Long> friendMemberIds = friendMembers.stream().map(Member::getId).toList();
        Map<Long, Long> weeklyStepsByMemberId = getWeeklyStepsByMemberId(friendMemberIds);
        Map<Long, CharacterResponse> charactersByMemberId =
                rankingCharacterReadService.getCharactersByMemberIds(friendMemberIds);

        List<FriendResponse> responses = friendMembers.stream()
                .map(friendMember -> {
                    CharacterResponse character = charactersByMemberId.get(friendMember.getId());
                    return FriendResponse.of(
                            friendMember,
                            weeklyStepsByMemberId.getOrDefault(friendMember.getId(), 0L),
                            character.defaultImageUrl(),
                            character.equippedItems()
                    );
                })
                .toList();
        return SliceResponse.from(new SliceImpl<>(
                responses,
                fixedPageable,
                friends.hasNext()
        ));
    }

    private Map<Long, Long> getWeeklyStepsByMemberId(List<Long> memberIds) {
        LocalDate currentDate = LocalDate.now(SERVICE_ZONE_ID);
        LocalDate startDate = HistoryPeriod.WEEK.getStartDate(currentDate);
        return memberHistoryRepository.findWeeklyStepsByMemberIds(
                        memberIds,
                        startDate,
                        currentDate
                ).stream()
                .collect(Collectors.toMap(
                        WeeklyRankingSummary::getMemberId,
                        WeeklyRankingSummary::getWeeklySteps
                ));
    }
}
