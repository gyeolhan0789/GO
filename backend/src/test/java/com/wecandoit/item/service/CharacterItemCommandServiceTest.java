package com.wecandoit.item.service;

import static com.wecandoit.item.domain.ItemFixture.item;
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
import com.wecandoit.item.repository.ItemRepository;
import com.wecandoit.item.repository.MemberEquippedItemRepository;
import com.wecandoit.item.repository.MemberItemRepository;
import java.util.List;
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
    private final ItemRepository itemRepository = Mockito.mock(ItemRepository.class);
    private final CharacterItemCommandService characterItemCommandService =
            new CharacterItemCommandService(
                    memberEquippedItemRepository,
                    memberItemRepository,
                    itemRepository
            );

    @Test
    @DisplayName("요청 상태와 다른 아이템만 장착하고 제거된 카테고리만 해제한다")
    void saveEquippedItemsAppliesOnlyDifferences() {
        // given
        MemberItem hat = memberItem(10L, 1L, 100L);
        MemberItem top = memberItem(20L, 1L, 200L);
        MemberItem bottom = memberItem(30L, 1L, 300L);
        MemberEquippedItem equippedHat = MemberEquippedItem.create(1L, 10L, ItemCategory.HAT);
        MemberEquippedItem equippedBottom = MemberEquippedItem.create(1L, 30L, ItemCategory.BOTTOM);
        when(memberItemRepository.findAllByMemberId(1L)).thenReturn(List.of(hat, top, bottom));
        when(itemRepository.findAllById(List.of(100L, 200L)))
                .thenReturn(List.of(item(100L, "HAT"), item(200L, "TOP")));
        when(memberEquippedItemRepository.findAllByMemberId(1L))
                .thenReturn(List.of(equippedHat, equippedBottom));
        when(memberEquippedItemRepository.findByMemberIdAndCategory(1L, ItemCategory.TOP))
                .thenReturn(Optional.empty());
        when(memberItemRepository.findByIdAndMemberId(30L, 1L)).thenReturn(Optional.of(bottom));
        when(memberEquippedItemRepository.findByMemberIdAndMemberItemId(1L, 30L))
                .thenReturn(Optional.of(equippedBottom));

        // when
        characterItemCommandService.saveEquippedItems(1L, List.of(10L, 20L));

        // then
        verify(memberEquippedItemRepository).save(Mockito.argThat(equippedItem ->
                equippedItem.getMemberItemId().equals(20L)
                        && equippedItem.getCategory() == ItemCategory.TOP
        ));
        verify(memberEquippedItemRepository).delete(equippedBottom);
        verify(memberEquippedItemRepository, never())
                .findByMemberIdAndCategory(1L, ItemCategory.HAT);
    }

    @Test
    @DisplayName("빈 목록을 저장하면 장착한 모든 아이템을 해제한다")
    void saveEquippedItemsUnequipsAllForEmptyRequest() {
        // given
        MemberItem hat = memberItem(10L, 1L, 100L);
        MemberEquippedItem equippedHat = MemberEquippedItem.create(1L, 10L, ItemCategory.HAT);
        when(memberItemRepository.findAllByMemberId(1L)).thenReturn(List.of(hat));
        when(itemRepository.findAllById(List.of())).thenReturn(List.of());
        when(memberEquippedItemRepository.findAllByMemberId(1L)).thenReturn(List.of(equippedHat));
        when(memberItemRepository.findByIdAndMemberId(10L, 1L)).thenReturn(Optional.of(hat));
        when(memberEquippedItemRepository.findByMemberIdAndMemberItemId(1L, 10L))
                .thenReturn(Optional.of(equippedHat));

        // when
        characterItemCommandService.saveEquippedItems(1L, List.of());

        // then
        verify(memberEquippedItemRepository).delete(equippedHat);
        verify(memberEquippedItemRepository, never()).save(Mockito.any());
    }

    @Test
    @DisplayName("다른 회원의 보유 아이템이 포함되면 변경 전에 거부한다")
    void saveEquippedItemsRejectsOtherMemberItemBeforeChanges() {
        // given
        when(memberItemRepository.findAllByMemberId(1L))
                .thenReturn(List.of(memberItem(10L, 1L, 100L)));

        // when, then
        assertThatThrownBy(() -> characterItemCommandService.saveEquippedItems(
                1L,
                List.of(10L, 20L)
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCESS_DENIED);
        verify(itemRepository, never()).findAllById(Mockito.any());
        verify(memberEquippedItemRepository, never()).findAllByMemberId(Mockito.anyLong());
    }

    @Test
    @DisplayName("같은 카테고리의 아이템이 여러 개이면 변경 전에 거부한다")
    void saveEquippedItemsRejectsDuplicateCategoriesBeforeChanges() {
        // given
        MemberItem firstHat = memberItem(10L, 1L, 100L);
        MemberItem secondHat = memberItem(20L, 1L, 200L);
        when(memberItemRepository.findAllByMemberId(1L)).thenReturn(List.of(firstHat, secondHat));
        when(itemRepository.findAllById(List.of(100L, 200L)))
                .thenReturn(List.of(item(100L, "HAT"), item(200L, "HAT")));

        // when, then
        assertThatThrownBy(() -> characterItemCommandService.saveEquippedItems(
                1L,
                List.of(10L, 20L)
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.DUPLICATE_ITEM_CATEGORY);
        verify(memberEquippedItemRepository, never()).findAllByMemberId(Mockito.anyLong());
    }

    @Test
    @DisplayName("원본 아이템을 찾을 수 없으면 변경 전에 실패한다")
    void saveEquippedItemsRejectsMissingItemBeforeChanges() {
        // given
        MemberItem memberItem = memberItem(10L, 1L, 100L);
        when(memberItemRepository.findAllByMemberId(1L)).thenReturn(List.of(memberItem));
        when(itemRepository.findAllById(List.of(100L))).thenReturn(List.of());

        // when, then
        assertThatThrownBy(() -> characterItemCommandService.saveEquippedItems(1L, List.of(10L)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ITEM_NOT_FOUND);
        verify(memberEquippedItemRepository, never()).findAllByMemberId(Mockito.anyLong());
    }

    @Test
    @DisplayName("원본 아이템의 카테고리가 올바르지 않으면 변경 전에 실패한다")
    void saveEquippedItemsRejectsInvalidCategoryBeforeChanges() {
        // given
        MemberItem memberItem = memberItem(10L, 1L, 100L);
        when(memberItemRepository.findAllByMemberId(1L)).thenReturn(List.of(memberItem));
        when(itemRepository.findAllById(List.of(100L)))
                .thenReturn(List.of(item(100L, "UNKNOWN")));

        // when, then
        assertThatThrownBy(() -> characterItemCommandService.saveEquippedItems(1L, List.of(10L)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_ITEM_CATEGORY);
        verify(memberEquippedItemRepository, never()).findAllByMemberId(Mockito.anyLong());
    }

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
