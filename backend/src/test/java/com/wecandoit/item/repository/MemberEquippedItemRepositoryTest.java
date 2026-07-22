package com.wecandoit.item.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.domain.MemberEquippedItem;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("장착 아이템 저장소")
class MemberEquippedItemRepositoryTest {

    @Autowired
    private MemberEquippedItemRepository memberEquippedItemRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("장착 아이템을 저장하고 조회한다")
    void saveAndFindEquippedItem() {
        // given
        MemberEquippedItem equippedItem = saveEquippedItem(1L, 10L, ItemCategory.HAT);
        clearPersistenceContext();

        // when
        Optional<MemberEquippedItem> found = memberEquippedItemRepository.findById(equippedItem.getId());

        // then
        assertThat(found).isPresent();
        assertThat(found.get().getMemberId()).isEqualTo(1L);
        assertThat(found.get().getMemberItemId()).isEqualTo(10L);
        assertThat(found.get().getCategory()).isEqualTo(ItemCategory.HAT);
    }

    @Test
    @DisplayName("회원의 전체 장착 아이템을 조회한다")
    void findAllByMemberIdReturnsMemberEquippedItems() {
        // given
        saveEquippedItem(1L, 10L, ItemCategory.HAT);
        saveEquippedItem(1L, 20L, ItemCategory.TOP);
        saveEquippedItem(2L, 30L, ItemCategory.BOTTOM);
        clearPersistenceContext();

        // when
        List<MemberEquippedItem> equippedItems = memberEquippedItemRepository.findAllByMemberId(1L);

        // then
        assertThat(equippedItems)
                .extracting(MemberEquippedItem::getMemberItemId)
                .containsExactlyInAnyOrder(10L, 20L);
    }

    @Test
    @DisplayName("회원과 카테고리로 장착 아이템을 조회한다")
    void findByMemberIdAndCategoryReturnsEquippedItem() {
        // given
        saveEquippedItem(1L, 10L, ItemCategory.HAT);
        clearPersistenceContext();

        // when
        Optional<MemberEquippedItem> found = memberEquippedItemRepository
                .findByMemberIdAndCategory(1L, ItemCategory.HAT);

        // then
        assertThat(found).isPresent();
        assertThat(found.get().getMemberItemId()).isEqualTo(10L);
    }

    @Test
    @DisplayName("회원과 보유 아이템 ID로 장착 아이템을 조회한다")
    void findByMemberIdAndMemberItemIdReturnsEquippedItem() {
        // given
        saveEquippedItem(1L, 10L, ItemCategory.HAT);
        clearPersistenceContext();

        // when
        Optional<MemberEquippedItem> found = memberEquippedItemRepository
                .findByMemberIdAndMemberItemId(1L, 10L);

        // then
        assertThat(found).isPresent();
        assertThat(found.get().getCategory()).isEqualTo(ItemCategory.HAT);
    }

    @Test
    @DisplayName("다른 회원의 장착 아이템은 조회하지 않는다")
    void findByMemberIdDoesNotReturnOtherMemberEquippedItem() {
        // given
        saveEquippedItem(2L, 10L, ItemCategory.HAT);
        clearPersistenceContext();

        // when
        Optional<MemberEquippedItem> found = memberEquippedItemRepository
                .findByMemberIdAndMemberItemId(1L, 10L);

        // then
        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("같은 회원은 동일 카테고리의 아이템을 중복 장착할 수 없다")
    void saveRejectsDuplicateMemberCategory() {
        // given
        saveEquippedItem(1L, 10L, ItemCategory.HAT);

        // when, then
        assertThatThrownBy(() -> saveEquippedItem(1L, 20L, ItemCategory.HAT))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("동일한 보유 아이템을 중복 장착할 수 없다")
    void saveRejectsDuplicateMemberItemId() {
        // given
        saveEquippedItem(1L, 10L, ItemCategory.HAT);

        // when, then
        assertThatThrownBy(() -> saveEquippedItem(2L, 10L, ItemCategory.TOP))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("회원과 카테고리로 장착 아이템을 삭제한다")
    void deleteByMemberIdAndCategoryDeletesEquippedItem() {
        // given
        saveEquippedItem(1L, 10L, ItemCategory.HAT);
        saveEquippedItem(1L, 20L, ItemCategory.TOP);

        // when
        memberEquippedItemRepository.deleteByMemberIdAndCategory(1L, ItemCategory.HAT);
        clearPersistenceContext();

        // then
        assertThat(memberEquippedItemRepository.findByMemberIdAndCategory(1L, ItemCategory.HAT))
                .isEmpty();
        assertThat(memberEquippedItemRepository.findByMemberIdAndCategory(1L, ItemCategory.TOP))
                .isPresent();
    }

    @Test
    @DisplayName("회원과 보유 아이템 ID로 장착 아이템을 삭제한다")
    void deleteByMemberIdAndMemberItemIdDeletesEquippedItem() {
        // given
        saveEquippedItem(1L, 10L, ItemCategory.HAT);

        // when
        memberEquippedItemRepository.deleteByMemberIdAndMemberItemId(1L, 10L);
        clearPersistenceContext();

        // then
        assertThat(memberEquippedItemRepository.findByMemberIdAndMemberItemId(1L, 10L))
                .isEmpty();
    }

    @Test
    @DisplayName("회원과 카테고리로 삭제할 때 다른 회원의 장착 아이템은 유지한다")
    void deleteByMemberIdAndCategoryKeepsOtherMemberEquippedItem() {
        // given
        saveEquippedItem(1L, 10L, ItemCategory.HAT);
        saveEquippedItem(2L, 20L, ItemCategory.HAT);

        // when
        memberEquippedItemRepository.deleteByMemberIdAndCategory(1L, ItemCategory.HAT);
        clearPersistenceContext();

        // then
        assertThat(memberEquippedItemRepository.findByMemberIdAndCategory(2L, ItemCategory.HAT))
                .isPresent();
    }

    @Test
    @DisplayName("회원과 보유 아이템 ID로 삭제할 때 다른 회원의 장착 아이템은 유지한다")
    void deleteByMemberIdAndMemberItemIdKeepsOtherMemberEquippedItem() {
        // given
        saveEquippedItem(1L, 10L, ItemCategory.HAT);
        saveEquippedItem(2L, 20L, ItemCategory.TOP);

        // when
        memberEquippedItemRepository.deleteByMemberIdAndMemberItemId(1L, 20L);
        clearPersistenceContext();

        // then
        assertThat(memberEquippedItemRepository.findByMemberIdAndMemberItemId(2L, 20L))
                .isPresent();
    }

    @Test
    @DisplayName("장착 카테고리를 문자열로 저장한다")
    void saveStoresCategoryAsString() {
        // given
        MemberEquippedItem equippedItem = saveEquippedItem(1L, 10L, ItemCategory.SUNGLASSES);
        clearPersistenceContext();

        // when
        String category = (String) entityManager.createNativeQuery(
                        "select category from member_equipped_items where id = :id"
                )
                .setParameter("id", equippedItem.getId())
                .getSingleResult();

        // then
        assertThat(category).isEqualTo("SUNGLASSES");
    }

    private MemberEquippedItem saveEquippedItem(
            Long memberId,
            Long memberItemId,
            ItemCategory category
    ) {
        return memberEquippedItemRepository.saveAndFlush(
                MemberEquippedItem.create(memberId, memberItemId, category)
        );
    }

    private void clearPersistenceContext() {
        entityManager.flush();
        entityManager.clear();
    }
}
