package com.wecandoit.item.repository;

import static com.wecandoit.item.domain.MemberItemFixture.memberItem;
import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.common.testcontainers.MySqlDataJpaTest;
import com.wecandoit.item.domain.MemberItem;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

@MySqlDataJpaTest
@DisplayName("보유 아이템 저장소")
class MemberItemRepositoryTest {

    @Autowired
    private MemberItemRepository memberItemRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("보유 아이템을 저장하고 ID로 조회한다")
    void saveAndFindMemberItem() {
        // given
        MemberItem memberItem = saveMemberItem(1L, 100L);
        clearPersistenceContext();

        // when
        Optional<MemberItem> found = memberItemRepository.findById(memberItem.getId());

        // then
        assertThat(found).isPresent();
        assertThat(found.get().getMemberId()).isEqualTo(1L);
        assertThat(found.get().getItemId()).isEqualTo(100L);
    }

    @Test
    @DisplayName("회원의 전체 보유 아이템을 조회한다")
    void findAllByMemberIdReturnsMemberItems() {
        // given
        saveMemberItem(1L, 100L);
        saveMemberItem(1L, 200L);
        saveMemberItem(2L, 300L);
        clearPersistenceContext();

        // when
        List<MemberItem> memberItems = memberItemRepository.findAllByMemberId(1L);

        // then
        assertThat(memberItems)
                .extracting(MemberItem::getItemId)
                .containsExactlyInAnyOrder(100L, 200L);
    }

    @Test
    @DisplayName("다른 회원의 보유 아이템은 목록에 포함하지 않는다")
    void findAllByMemberIdExcludesOtherMemberItems() {
        // given
        saveMemberItem(1L, 100L);
        saveMemberItem(2L, 200L);
        clearPersistenceContext();

        // when
        List<MemberItem> memberItems = memberItemRepository.findAllByMemberId(1L);

        // then
        assertThat(memberItems)
                .extracting(MemberItem::getMemberId)
                .containsOnly(1L);
    }

    @Test
    @DisplayName("보유 아이템 ID와 회원 ID로 단건 조회한다")
    void findByIdAndMemberIdReturnsMemberItem() {
        // given
        MemberItem memberItem = saveMemberItem(1L, 100L);
        clearPersistenceContext();

        // when
        Optional<MemberItem> found = memberItemRepository.findByIdAndMemberId(
                memberItem.getId(),
                1L
        );

        // then
        assertThat(found).isPresent();
        assertThat(found.get().getItemId()).isEqualTo(100L);
    }

    @Test
    @DisplayName("다른 회원 ID로는 보유 아이템 단건을 조회할 수 없다")
    void findByIdAndMemberIdRejectsOtherMember() {
        // given
        MemberItem memberItem = saveMemberItem(1L, 100L);
        clearPersistenceContext();

        // when
        Optional<MemberItem> found = memberItemRepository.findByIdAndMemberId(
                memberItem.getId(),
                2L
        );

        // then
        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("회원이 원본 아이템을 보유하고 있는지 확인한다")
    void existsByMemberIdAndItemIdReturnsTrue() {
        // given
        saveMemberItem(1L, 100L);
        clearPersistenceContext();

        // when
        boolean exists = memberItemRepository.existsByMemberIdAndItemId(1L, 100L);

        // then
        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("다른 회원만 보유한 원본 아이템은 보유한 것으로 확인하지 않는다")
    void existsByMemberIdAndItemIdDistinguishesMember() {
        // given
        saveMemberItem(2L, 100L);
        clearPersistenceContext();

        // when
        boolean exists = memberItemRepository.existsByMemberIdAndItemId(1L, 100L);

        // then
        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("보유 아이템이 없는 회원은 빈 목록을 조회한다")
    void findAllByMemberIdReturnsEmptyList() {
        // when
        List<MemberItem> memberItems = memberItemRepository.findAllByMemberId(1L);

        // then
        assertThat(memberItems).isEmpty();
    }

    private MemberItem saveMemberItem(Long memberId, Long itemId) {
        return memberItemRepository.saveAndFlush(memberItem(null, memberId, itemId));
    }

    private void clearPersistenceContext() {
        entityManager.flush();
        entityManager.clear();
    }
}
