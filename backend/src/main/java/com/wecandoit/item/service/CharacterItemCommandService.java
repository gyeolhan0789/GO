package com.wecandoit.item.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.domain.MemberEquippedItem;
import com.wecandoit.item.domain.MemberItem;
import com.wecandoit.item.repository.ItemRepository;
import com.wecandoit.item.repository.MemberEquippedItemRepository;
import com.wecandoit.item.repository.MemberItemRepository;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class CharacterItemCommandService {

    private final MemberEquippedItemRepository memberEquippedItemRepository;
    private final MemberItemRepository memberItemRepository;
    private final ItemRepository itemRepository;

    public void saveEquippedItems(Long memberId, List<Long> memberItemIds) {
        List<MemberItem> requestedMemberItems = findRequestedMemberItems(memberId, memberItemIds);
        Map<ItemCategory, MemberItem> requestedItemsByCategory = mapRequestedItemsByCategory(
                requestedMemberItems
        );
        List<MemberEquippedItem> equippedItems = memberEquippedItemRepository.findAllByMemberId(memberId);
        Map<ItemCategory, MemberEquippedItem> equippedItemsByCategory = equippedItems.stream()
                .collect(Collectors.toMap(MemberEquippedItem::getCategory, Function.identity()));

        requestedItemsByCategory.forEach((category, memberItem) -> {
            MemberEquippedItem equippedItem = equippedItemsByCategory.get(category);
            if (equippedItem == null || !equippedItem.getMemberItemId().equals(memberItem.getId())) {
                equipItem(memberId, memberItem, category);
            }
        });

        equippedItems.stream()
                .filter(equippedItem -> !requestedItemsByCategory.containsKey(equippedItem.getCategory()))
                .forEach(equippedItem -> unequipItem(memberId, equippedItem.getMemberItemId()));
    }

    public MemberEquippedItem equipItem(
            Long memberId,
            MemberItem memberItem,
            ItemCategory category
    ) {
        if (!memberItem.getMemberId().equals(memberId)) {
            throw new CustomException(ErrorCode.ACCESS_DENIED);
        }

        return memberEquippedItemRepository.findByMemberIdAndCategory(memberId, category)
                .map(equippedItem -> changeMemberItem(equippedItem, memberItem.getId()))
                .orElseGet(() -> memberEquippedItemRepository.save(
                        MemberEquippedItem.create(memberId, memberItem.getId(), category)
                ));
    }

    public void unequipItem(Long memberId, Long memberItemId) {
        MemberItem memberItem = memberItemRepository.findByIdAndMemberId(memberItemId, memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.ACCESS_DENIED));

        memberEquippedItemRepository.findByMemberIdAndMemberItemId(memberId, memberItem.getId())
                .ifPresent(memberEquippedItemRepository::delete);
    }

    private MemberEquippedItem changeMemberItem(
            MemberEquippedItem equippedItem,
            Long memberItemId
    ) {
        if (!equippedItem.getMemberItemId().equals(memberItemId)) {
            equippedItem.changeMemberItem(memberItemId);
        }
        return equippedItem;
    }

    private List<MemberItem> findRequestedMemberItems(Long memberId, List<Long> memberItemIds) {
        Map<Long, MemberItem> ownedItemsById = memberItemRepository.findAllByMemberId(memberId).stream()
                .collect(Collectors.toMap(MemberItem::getId, Function.identity()));

        return memberItemIds.stream()
                .map(memberItemId -> {
                    MemberItem memberItem = ownedItemsById.get(memberItemId);
                    if (memberItem == null) {
                        throw new CustomException(ErrorCode.ACCESS_DENIED);
                    }
                    return memberItem;
                })
                .toList();
    }

    private Map<ItemCategory, MemberItem> mapRequestedItemsByCategory(
            List<MemberItem> memberItems
    ) {
        Map<Long, Item> itemsById = itemRepository.findAllById(
                        memberItems.stream().map(MemberItem::getItemId).toList()
                ).stream()
                .collect(Collectors.toMap(Item::getId, Function.identity()));
        Map<ItemCategory, MemberItem> memberItemsByCategory = new EnumMap<>(ItemCategory.class);

        for (MemberItem memberItem : memberItems) {
            Item item = itemsById.get(memberItem.getItemId());
            if (item == null) {
                throw new CustomException(ErrorCode.ITEM_NOT_FOUND);
            }
            ItemCategory category = parseCategory(item.getCategory());
            if (memberItemsByCategory.putIfAbsent(category, memberItem) != null) {
                throw new CustomException(ErrorCode.DUPLICATE_ITEM_CATEGORY);
            }
        }
        return memberItemsByCategory;
    }

    private ItemCategory parseCategory(String category) {
        try {
            return ItemCategory.valueOf(category);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new CustomException(ErrorCode.INVALID_ITEM_CATEGORY);
        }
    }
}
