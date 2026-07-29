package com.wecandoit.friend.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.friend.domain.Friend;
import com.wecandoit.friend.dto.FriendResponse;
import com.wecandoit.friend.repository.FriendRepository;
import com.wecandoit.history.domain.HistoryPeriod;
import com.wecandoit.history.repository.MemberHistoryRepository;
import com.wecandoit.history.repository.WeeklyRankingSummary;
import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.MemberEquippedItem;
import com.wecandoit.item.domain.MemberItem;
import com.wecandoit.item.repository.ItemRepository;
import com.wecandoit.item.repository.MemberEquippedItemRepository;
import com.wecandoit.item.repository.MemberItemRepository;
import com.wecandoit.member.domain.Member;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
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
    private final MemberEquippedItemRepository memberEquippedItemRepository;
    private final MemberItemRepository memberItemRepository;
    private final ItemRepository itemRepository;

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
        Map<Long, List<EquippedItemResponse>> equippedItemsByMemberId =
                getEquippedItemsByMemberId(friendMemberIds);

        List<FriendResponse> responses = friendMembers.stream()
                .map(friendMember -> FriendResponse.of(
                        friendMember,
                        weeklyStepsByMemberId.getOrDefault(friendMember.getId(), 0L),
                        equippedItemsByMemberId.getOrDefault(friendMember.getId(), List.of())
                ))
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

    private Map<Long, List<EquippedItemResponse>> getEquippedItemsByMemberId(
            List<Long> memberIds
    ) {
        List<MemberEquippedItem> equippedItems =
                memberEquippedItemRepository.findAllByMemberIdIn(memberIds);
        if (equippedItems.isEmpty()) {
            return Map.of();
        }

        Map<Long, MemberItem> memberItemsById = memberItemRepository.findAllById(
                        equippedItems.stream()
                                .map(MemberEquippedItem::getMemberItemId)
                                .toList()
                ).stream()
                .collect(Collectors.toMap(MemberItem::getId, Function.identity()));
        Map<Long, Item> itemsById = itemRepository.findAllById(
                        memberItemsById.values().stream()
                                .map(MemberItem::getItemId)
                                .toList()
                ).stream()
                .collect(Collectors.toMap(Item::getId, Function.identity()));

        return equippedItems.stream()
                .collect(Collectors.groupingBy(
                        MemberEquippedItem::getMemberId,
                        Collectors.mapping(
                                equippedItem -> toEquippedItemResponse(
                                        equippedItem,
                                        memberItemsById,
                                        itemsById
                                ),
                                Collectors.toList()
                        )
                ));
    }

    private EquippedItemResponse toEquippedItemResponse(
            MemberEquippedItem equippedItem,
            Map<Long, MemberItem> memberItemsById,
            Map<Long, Item> itemsById
    ) {
        MemberItem memberItem = memberItemsById.get(equippedItem.getMemberItemId());
        if (memberItem == null || !memberItem.getMemberId().equals(equippedItem.getMemberId())) {
            throw new CustomException(ErrorCode.ITEM_NOT_FOUND);
        }
        Item item = itemsById.get(memberItem.getItemId());
        if (item == null) {
            throw new CustomException(ErrorCode.ITEM_NOT_FOUND);
        }
        return EquippedItemResponse.of(equippedItem, memberItem, item);
    }
}
