package com.wecandoit.item.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("장착 아이템")
class MemberEquippedItemTest {

    @Test
    @DisplayName("회원과 보유 아이템 및 카테고리로 장착 아이템을 생성한다")
    void createEquippedItem() {
        // when
        MemberEquippedItem equippedItem = MemberEquippedItem.create(
                1L,
                10L,
                ItemCategory.HAT
        );

        // then
        assertThat(equippedItem.getMemberId()).isEqualTo(1L);
        assertThat(equippedItem.getMemberItemId()).isEqualTo(10L);
        assertThat(equippedItem.getCategory()).isEqualTo(ItemCategory.HAT);
    }

    @Test
    @DisplayName("같은 카테고리의 장착 아이템을 다른 보유 아이템으로 교체한다")
    void changeMemberItemReplacesMemberItem() {
        // given
        MemberEquippedItem equippedItem = MemberEquippedItem.create(1L, 10L, ItemCategory.HAT);

        // when
        equippedItem.changeMemberItem(20L);

        // then
        assertThat(equippedItem.getMemberItemId()).isEqualTo(20L);
        assertThat(equippedItem.getMemberId()).isEqualTo(1L);
        assertThat(equippedItem.getCategory()).isEqualTo(ItemCategory.HAT);
    }
}
