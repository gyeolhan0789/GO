package com.wecandoit.item.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.domain.MemberEquippedItem;
import com.wecandoit.item.domain.MemberItem;
import com.wecandoit.item.repository.MemberEquippedItemRepository;
import com.wecandoit.item.repository.MemberItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class CharacterItemCommandService {

    private final MemberEquippedItemRepository memberEquippedItemRepository;
    private final MemberItemRepository memberItemRepository;

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
}
