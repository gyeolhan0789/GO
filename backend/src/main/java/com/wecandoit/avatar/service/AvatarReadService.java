package com.wecandoit.avatar.service;

import com.wecandoit.avatar.domain.AvatarImage;
import com.wecandoit.avatar.repository.AvatarImageRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.item.controller.response.AvatarResponse;
import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.MemberEquippedItem;
import com.wecandoit.item.domain.MemberItem;
import com.wecandoit.item.repository.ItemRepository;
import com.wecandoit.item.repository.MemberEquippedItemRepository;
import com.wecandoit.item.repository.MemberItemRepository;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AvatarReadService {

    private final AvatarImageRepository avatarImageRepository;
    private final MemberEquippedItemRepository memberEquippedItemRepository;
    private final MemberItemRepository memberItemRepository;
    private final ItemRepository itemRepository;

    public Map<Long, AvatarResponse> getAvatars(List<Member> members) {
        if (members.isEmpty()) {
            return Map.of();
        }

        List<Long> memberIds = members.stream()
                .map(Member::getId)
                .toList();
        Map<Gender, String> defaultImageUrlsByGender =
                avatarImageRepository.findAllByOrderByGenderAsc().stream()
                        .collect(Collectors.toMap(
                                AvatarImage::getGender,
                                AvatarImage::getImageUrl
                        ));
        Map<Long, List<EquippedItemResponse>> equippedItemsByMemberId =
                getEquippedItemsByMemberIds(memberIds);

        return members.stream()
                .collect(Collectors.toMap(
                        Member::getId,
                        member -> AvatarResponse.of(
                                member,
                                defaultImageUrlsByGender.get(member.getGender()),
                                equippedItemsByMemberId.getOrDefault(member.getId(), List.of())
                        )
                ));
    }

    private Map<Long, List<EquippedItemResponse>> getEquippedItemsByMemberIds(
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
                                .distinct()
                                .sorted()
                                .toList()
                ).stream()
                .collect(Collectors.toMap(MemberItem::getId, Function.identity()));
        Map<Long, Item> itemsById = itemRepository.findAllById(
                        memberItemsById.values().stream()
                                .map(MemberItem::getItemId)
                                .distinct()
                                .sorted()
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
