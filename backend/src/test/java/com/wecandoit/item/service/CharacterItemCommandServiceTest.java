package com.wecandoit.item.service;

import static com.wecandoit.item.domain.MemberItemFixture.memberItem;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.domain.MemberEquippedItem;
import com.wecandoit.item.domain.MemberItem;
import com.wecandoit.item.repository.MemberEquippedItemRepository;
import com.wecandoit.item.repository.MemberItemRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

@DisplayName("캐릭터 아이템 명령 서비스")
class CharacterItemCommandServiceTest {

    private final MemberEquippedItemRepository memberEquippedItemRepository = Mockito.mock(
            MemberEquippedItemRepository.class
    );
    private final MemberItemRepository memberItemRepository = Mockito.mock(MemberItemRepository.class);
    private final CharacterItemCommandService characterItemCommandService =
            new CharacterItemCommandService(memberEquippedItemRepository, memberItemRepository);

    @Test
    @DisplayName("보유 아이템의 카테고리가 비어 있으면 새로 장착한다")
    void equipItemCreatesEquippedItem() {
        // given
        MemberItem memberItem = memberItem(10L, 1L, 100L);
        when(memberEquippedItemRepository.findByMemberIdAndCategory(1L, ItemCategory.HAT))
                .thenReturn(Optional.empty());
        when(memberEquippedItemRepository.save(Mockito.any(MemberEquippedItem.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // when
        MemberEquippedItem result = characterItemCommandService.equipItem(
                1L,
                memberItem,
                ItemCategory.HAT
        );

        // then
        ArgumentCaptor<MemberEquippedItem> captor = ArgumentCaptor.forClass(MemberEquippedItem.class);
        verify(memberEquippedItemRepository).save(captor.capture());
        assertThat(captor.getValue()).isSameAs(result);
        assertThat(result.getMemberId()).isEqualTo(1L);
        assertThat(result.getMemberItemId()).isEqualTo(10L);
        assertThat(result.getCategory()).isEqualTo(ItemCategory.HAT);
    }

    @Test
    @DisplayName("같은 카테고리의 다른 보유 아이템을 장착하면 교체한다")
    void equipItemChangesEquippedItemInSameCategory() {
        // given
        MemberItem memberItem = memberItem(20L, 1L, 200L);
        MemberEquippedItem equippedItem = MemberEquippedItem.create(1L, 10L, ItemCategory.HAT);
        when(memberEquippedItemRepository.findByMemberIdAndCategory(1L, ItemCategory.HAT))
                .thenReturn(Optional.of(equippedItem));

        // when
        MemberEquippedItem result = characterItemCommandService.equipItem(
                1L,
                memberItem,
                ItemCategory.HAT
        );

        // then
        assertThat(result).isSameAs(equippedItem);
        assertThat(result.getMemberItemId()).isEqualTo(20L);
        verify(memberEquippedItemRepository, never()).save(Mockito.any());
    }

    @Test
    @DisplayName("이미 장착한 동일 아이템을 다시 장착하면 기존 상태를 유지한다")
    void equipItemKeepsSameEquippedItem() {
        // given
        MemberItem memberItem = memberItem(10L, 1L, 100L);
        MemberEquippedItem equippedItem = MemberEquippedItem.create(1L, 10L, ItemCategory.HAT);
        when(memberEquippedItemRepository.findByMemberIdAndCategory(1L, ItemCategory.HAT))
                .thenReturn(Optional.of(equippedItem));

        // when
        MemberEquippedItem result = characterItemCommandService.equipItem(
                1L,
                memberItem,
                ItemCategory.HAT
        );

        // then
        assertThat(result).isSameAs(equippedItem);
        assertThat(result.getMemberItemId()).isEqualTo(10L);
        verify(memberEquippedItemRepository, never()).save(Mockito.any());
    }

    @Test
    @DisplayName("다른 회원이 보유한 아이템은 장착할 수 없다")
    void equipItemRejectsOtherMemberItem() {
        // given
        MemberItem memberItem = memberItem(10L, 2L, 100L);

        // when, then
        assertThatThrownBy(() -> characterItemCommandService.equipItem(
                1L,
                memberItem,
                ItemCategory.HAT
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCESS_DENIED);
        verify(memberEquippedItemRepository, never())
                .findByMemberIdAndCategory(Mockito.anyLong(), Mockito.any());
        verify(memberEquippedItemRepository, never()).save(Mockito.any());
    }

    @Test
    @DisplayName("장착 중인 보유 아이템을 해제하면 장착 레코드를 삭제한다")
    void unequipItemDeletesEquippedItem() {
        // given
        MemberItem memberItem = memberItem(10L, 1L, 100L);
        MemberEquippedItem equippedItem = MemberEquippedItem.create(1L, 10L, ItemCategory.HAT);
        when(memberItemRepository.findByIdAndMemberId(10L, 1L))
                .thenReturn(Optional.of(memberItem));
        when(memberEquippedItemRepository.findByMemberIdAndMemberItemId(1L, 10L))
                .thenReturn(Optional.of(equippedItem));

        // when
        characterItemCommandService.unequipItem(1L, 10L);

        // then
        verify(memberEquippedItemRepository).delete(equippedItem);
    }

    @Test
    @DisplayName("이미 해제된 보유 아이템을 다시 해제하면 변경 없이 성공한다")
    void unequipItemKeepsAlreadyUnequippedState() {
        // given
        MemberItem memberItem = memberItem(10L, 1L, 100L);
        when(memberItemRepository.findByIdAndMemberId(10L, 1L))
                .thenReturn(Optional.of(memberItem));
        when(memberEquippedItemRepository.findByMemberIdAndMemberItemId(1L, 10L))
                .thenReturn(Optional.empty());

        // when
        characterItemCommandService.unequipItem(1L, 10L);

        // then
        verify(memberEquippedItemRepository, never()).delete(Mockito.any());
    }

    @Test
    @DisplayName("다른 회원의 보유 아이템은 해제할 수 없다")
    void unequipItemRejectsOtherMemberItem() {
        // given
        when(memberItemRepository.findByIdAndMemberId(10L, 1L))
                .thenReturn(Optional.empty());

        // when, then
        assertThatThrownBy(() -> characterItemCommandService.unequipItem(1L, 10L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCESS_DENIED);
        verify(memberEquippedItemRepository, never())
                .findByMemberIdAndMemberItemId(Mockito.anyLong(), Mockito.anyLong());
        verify(memberEquippedItemRepository, never()).delete(Mockito.any());
    }

    @Test
    @DisplayName("다른 회원의 장착 상태는 삭제하지 않는다")
    void unequipItemKeepsOtherMemberEquippedItem() {
        // given
        MemberItem memberItem = memberItem(10L, 1L, 100L);
        when(memberItemRepository.findByIdAndMemberId(10L, 1L))
                .thenReturn(Optional.of(memberItem));
        when(memberEquippedItemRepository.findByMemberIdAndMemberItemId(1L, 10L))
                .thenReturn(Optional.empty());

        // when
        characterItemCommandService.unequipItem(1L, 10L);

        // then
        verify(memberEquippedItemRepository)
                .findByMemberIdAndMemberItemId(1L, 10L);
        verify(memberEquippedItemRepository, never()).delete(Mockito.any());
    }
}
