package com.wecandoit.item.repository;

import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.domain.MemberEquippedItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberEquippedItemRepository extends JpaRepository<MemberEquippedItem, Long> {

    List<MemberEquippedItem> findAllByMemberId(Long memberId);

    Optional<MemberEquippedItem> findByMemberIdAndCategory(Long memberId, ItemCategory category);

    Optional<MemberEquippedItem> findByMemberIdAndMemberItemId(Long memberId, Long memberItemId);

    void deleteByMemberIdAndCategory(Long memberId, ItemCategory category);

    void deleteByMemberIdAndMemberItemId(Long memberId, Long memberItemId);
}
