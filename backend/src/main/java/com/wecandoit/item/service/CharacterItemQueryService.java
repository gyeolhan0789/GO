package com.wecandoit.item.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.item.controller.response.CharacterResponse;
import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.MemberEquippedItem;
import com.wecandoit.item.domain.MemberItem;
import com.wecandoit.item.repository.ItemRepository;
import com.wecandoit.item.repository.MemberEquippedItemRepository;
import com.wecandoit.item.repository.MemberItemRepository;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
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
public class CharacterItemQueryService {

    private final MemberRepository memberRepository;
    private final MemberEquippedItemRepository memberEquippedItemRepository;
    private final MemberItemRepository memberItemRepository;
    private final ItemRepository itemRepository;

    public CharacterResponse getMyCharacter(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        List<MemberEquippedItem> equippedItems = memberEquippedItemRepository.findAllByMemberId(memberId);
        if (equippedItems.isEmpty()) {
            return CharacterResponse.of(member, List.of());
        }

        Map<Long, MemberItem> memberItemsById = memberItemRepository.findAllById(
                        equippedItems.stream().map(MemberEquippedItem::getMemberItemId).toList()
                ).stream()
                .collect(Collectors.toMap(MemberItem::getId, Function.identity()));
        Map<Long, Item> itemsById = itemRepository.findAllById(
                        memberItemsById.values().stream().map(MemberItem::getItemId).toList()
                ).stream()
                .collect(Collectors.toMap(Item::getId, Function.identity()));

        List<EquippedItemResponse> equippedItemResponses = equippedItems.stream()
                .map(equippedItem -> toResponse(memberId, equippedItem, memberItemsById, itemsById))
                .toList();
        return CharacterResponse.of(member, equippedItemResponses);
    }

    private EquippedItemResponse toResponse(
            Long memberId,
            MemberEquippedItem equippedItem,
            Map<Long, MemberItem> memberItemsById,
            Map<Long, Item> itemsById
    ) {
        MemberItem memberItem = memberItemsById.get(equippedItem.getMemberItemId());
        if (memberItem == null || !memberItem.getMemberId().equals(memberId)) {
            throw new CustomException(ErrorCode.ITEM_NOT_FOUND);
        }
        Item item = itemsById.get(memberItem.getItemId());
        if (item == null) {
            throw new CustomException(ErrorCode.ITEM_NOT_FOUND);
        }
        return EquippedItemResponse.of(equippedItem, memberItem, item);
    }
}
