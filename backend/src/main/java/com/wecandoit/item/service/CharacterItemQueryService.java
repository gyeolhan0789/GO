package com.wecandoit.item.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.item.controller.response.CharacterResponse;
import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.item.controller.response.MemberItemResponse;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.ItemCategory;
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

    public List<MemberItemResponse> getMyItems(Long memberId) {
        return getMyItems(memberId, null);
    }

    public List<MemberItemResponse> getMyItems(Long memberId, String category) {
        ItemCategory itemCategory = parseCategory(category);
        memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        List<MemberItem> memberItems = memberItemRepository.findAllByMemberId(memberId);
        if (memberItems.isEmpty()) {
            return List.of();
        }

        List<Long> itemIds = memberItems.stream().map(MemberItem::getItemId).toList();
        Map<Long, Item> itemsById = findItems(itemIds, itemCategory).stream()
                .collect(Collectors.toMap(Item::getId, Function.identity()));

        return memberItems.stream()
                .filter(memberItem -> itemCategory == null || itemsById.containsKey(memberItem.getItemId()))
                .map(memberItem -> toResponse(memberItem, itemsById))
                .toList();
    }

    private List<Item> findItems(List<Long> itemIds, ItemCategory category) {
        if (category == null) {
            return itemRepository.findAllById(itemIds);
        }
        return itemRepository.findAllByIdInAndCategory(itemIds, category.name());
    }

    private ItemCategory parseCategory(String category) {
        if (category == null) {
            return null;
        }
        try {
            return ItemCategory.valueOf(category);
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_ITEM_CATEGORY);
        }
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

    private MemberItemResponse toResponse(MemberItem memberItem, Map<Long, Item> itemsById) {
        Item item = itemsById.get(memberItem.getItemId());
        if (item == null) {
            throw new CustomException(ErrorCode.ITEM_NOT_FOUND);
        }
        return MemberItemResponse.of(memberItem, item);
    }
}
