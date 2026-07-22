package com.wecandoit.item.repository;

import com.wecandoit.item.domain.MemberItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberItemRepository extends JpaRepository<MemberItem, Long> {

    List<MemberItem> findAllByMemberId(Long memberId);

    Optional<MemberItem> findByIdAndMemberId(Long memberItemId, Long memberId);

    boolean existsByMemberIdAndItemId(Long memberId, Long itemId);
}
