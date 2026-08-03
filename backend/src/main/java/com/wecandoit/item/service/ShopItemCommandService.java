package com.wecandoit.item.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.point.domain.PointHistory;
import com.wecandoit.point.repository.PointHistoryRepository;
import com.wecandoit.item.controller.response.ItemPurchaseResponse;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.MemberItem;
import com.wecandoit.item.repository.ItemRepository;
import com.wecandoit.item.repository.MemberItemRepository;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ShopItemCommandService {

    private final MemberRepository memberRepository;
    private final ItemRepository itemRepository;
    private final MemberItemRepository memberItemRepository;
    private final PointHistoryRepository pointHistoryRepository;

    public ItemPurchaseResponse purchaseItem(Long memberId, Long itemId) {
        Member member = memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new CustomException(ErrorCode.ITEM_NOT_FOUND));
        if (!item.isAvailableForSale()) {
            throw new CustomException(ErrorCode.ITEM_NOT_AVAILABLE_FOR_SALE);
        }
        if (memberItemRepository.existsByMemberIdAndItemId(memberId, itemId)) {
            throw new CustomException(ErrorCode.ITEM_ALREADY_OWNED);
        }

        member.deductPoint(item.getPrice());
        MemberItem memberItem = memberItemRepository.save(MemberItem.create(memberId, itemId));
        pointHistoryRepository.save(PointHistory.itemPurchase(memberId, itemId, item.getName(), item.getPrice()));
        return ItemPurchaseResponse.of(memberItem, member.getPoint());
    }
}
