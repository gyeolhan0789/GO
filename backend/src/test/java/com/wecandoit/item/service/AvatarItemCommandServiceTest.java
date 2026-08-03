package com.wecandoit.item.service;

import static com.wecandoit.item.domain.ItemFixture.item;
import static com.wecandoit.item.domain.MemberItemFixture.memberItem;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("아바타 아이템 명령 서비스")
class AvatarItemCommandServiceTest {

    @Mock
    private MemberEquippedItemRepository memberEquippedItemRepository;
    @Mock
    private MemberItemRepository memberItemRepository;
    @Mock
    private ItemRepository itemRepository;
    private AvatarItemCommandService avatarItemCommandService;

    @BeforeEach
    void setUp() {
        avatarItemCommandService = new AvatarItemCommandService(
                memberEquippedItemRepository,
                memberItemRepository,
                itemRepository
        );
    }

    @Test
    @DisplayName("요청 상태와 다른 아이템만 장착하고 제거된 카테고리만 해제한다")
    void saveEquippedItemsAppliesOnlyDifferences() {
        // given
        MemberItem hat = memberItem(10L, 1L, 100L);
        MemberItem top = memberItem(20L, 1L, 200L);
        MemberItem bottom = memberItem(30L, 1L, 300L);
        MemberEquippedItem equippedHat = MemberEquippedItem.create(1L, 10L, ItemCategory.HAT);
        MemberEquippedItem equippedBottom = MemberEquippedItem.create(1L, 30L, ItemCategory.BOTTOM);
        given(memberItemRepository.findAllByMemberId(1L)).willReturn(List.of(hat, top, bottom));
        given(itemRepository.findAllById(List.of(100L, 200L)))
                .willReturn(List.of(item(100L, ItemCategory.HAT), item(200L, ItemCategory.TOP)));
        given(memberEquippedItemRepository.findAllByMemberId(1L))
                .willReturn(List.of(equippedHat, equippedBottom));
        given(memberEquippedItemRepository.findByMemberIdAndCategory(1L, ItemCategory.TOP))
                .willReturn(Optional.empty());
        given(memberItemRepository.findByIdAndMemberId(30L, 1L)).willReturn(Optional.of(bottom));
        given(memberEquippedItemRepository.findByMemberIdAndMemberItemId(1L, 30L))
                .willReturn(Optional.of(equippedBottom));

        // when
        avatarItemCommandService.saveEquippedItems(1L, List.of(10L, 20L));

        // then
        then(memberEquippedItemRepository).should().save(Mockito.argThat(equippedItem ->
                equippedItem.getMemberItemId().equals(20L)
                        && equippedItem.getCategory() == ItemCategory.TOP
        ));
        then(memberEquippedItemRepository).should().delete(equippedBottom);
        then(memberEquippedItemRepository).should(never())
                .findByMemberIdAndCategory(1L, ItemCategory.HAT);
    }

    @Test
    @DisplayName("빈 목록을 저장하면 장착한 모든 아이템을 해제한다")
    void saveEquippedItemsUnequipsAllForEmptyRequest() {
        // given
        MemberItem hat = memberItem(10L, 1L, 100L);
        MemberEquippedItem equippedHat = MemberEquippedItem.create(1L, 10L, ItemCategory.HAT);
        given(memberItemRepository.findAllByMemberId(1L)).willReturn(List.of(hat));
        given(itemRepository.findAllById(List.of())).willReturn(List.of());
        given(memberEquippedItemRepository.findAllByMemberId(1L)).willReturn(List.of(equippedHat));
        given(memberItemRepository.findByIdAndMemberId(10L, 1L)).willReturn(Optional.of(hat));
        given(memberEquippedItemRepository.findByMemberIdAndMemberItemId(1L, 10L))
                .willReturn(Optional.of(equippedHat));

        // when
        avatarItemCommandService.saveEquippedItems(1L, List.of());

        // then
        then(memberEquippedItemRepository).should().delete(equippedHat);
        then(memberEquippedItemRepository).should(never()).save(Mockito.any());
    }

    @Test
    @DisplayName("다른 회원의 보유 아이템이 포함되면 변경 전에 거부한다")
    void saveEquippedItemsRejectsOtherMemberItemBeforeChanges() {
        // given
        given(memberItemRepository.findAllByMemberId(1L))
                .willReturn(List.of(memberItem(10L, 1L, 100L)));

        // when & then
        assertThatThrownBy(() -> avatarItemCommandService.saveEquippedItems(
                1L,
                List.of(10L, 20L)
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCESS_DENIED);
        then(itemRepository).should(never()).findAllById(Mockito.any());
        then(memberEquippedItemRepository).should(never()).findAllByMemberId(Mockito.anyLong());
    }

    @Test
    @DisplayName("같은 카테고리의 아이템이 여러 개이면 변경 전에 거부한다")
    void saveEquippedItemsRejectsDuplicateCategoriesBeforeChanges() {
        // given
        MemberItem firstHat = memberItem(10L, 1L, 100L);
        MemberItem secondHat = memberItem(20L, 1L, 200L);
        given(memberItemRepository.findAllByMemberId(1L)).willReturn(List.of(firstHat, secondHat));
        given(itemRepository.findAllById(List.of(100L, 200L)))
                .willReturn(List.of(item(100L, ItemCategory.HAT), item(200L, ItemCategory.HAT)));

        // when & then
        assertThatThrownBy(() -> avatarItemCommandService.saveEquippedItems(
                1L,
                List.of(10L, 20L)
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.DUPLICATE_ITEM_CATEGORY);
        then(memberEquippedItemRepository).should(never()).findAllByMemberId(Mockito.anyLong());
    }

    @Test
    @DisplayName("원본 아이템을 찾을 수 없으면 변경 전에 실패한다")
    void saveEquippedItemsRejectsMissingItemBeforeChanges() {
        // given
        MemberItem memberItem = memberItem(10L, 1L, 100L);
        given(memberItemRepository.findAllByMemberId(1L)).willReturn(List.of(memberItem));
        given(itemRepository.findAllById(List.of(100L))).willReturn(List.of());

        // when & then
        assertThatThrownBy(() -> avatarItemCommandService.saveEquippedItems(1L, List.of(10L)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ITEM_NOT_FOUND);
        then(memberEquippedItemRepository).should(never()).findAllByMemberId(Mockito.anyLong());
    }

    @Test
    @DisplayName("보유 아이템의 카테고리가 비어 있으면 새로 장착한다")
    void equipItemCreatesEquippedItem() {
        // given
        MemberItem memberItem = memberItem(10L, 1L, 100L);
        given(memberEquippedItemRepository.findByMemberIdAndCategory(1L, ItemCategory.HAT))
                .willReturn(Optional.empty());
        given(memberEquippedItemRepository.save(Mockito.any(MemberEquippedItem.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        // when
        MemberEquippedItem result = avatarItemCommandService.equipItem(
                1L,
                memberItem,
                ItemCategory.HAT
        );

        // then
        ArgumentCaptor<MemberEquippedItem> captor = ArgumentCaptor.forClass(MemberEquippedItem.class);
        then(memberEquippedItemRepository).should().save(captor.capture());
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
        given(memberEquippedItemRepository.findByMemberIdAndCategory(1L, ItemCategory.HAT))
                .willReturn(Optional.of(equippedItem));

        // when
        MemberEquippedItem result = avatarItemCommandService.equipItem(
                1L,
                memberItem,
                ItemCategory.HAT
        );

        // then
        assertThat(result).isSameAs(equippedItem);
        assertThat(result.getMemberItemId()).isEqualTo(20L);
        then(memberEquippedItemRepository).should(never()).save(Mockito.any());
    }

    @Test
    @DisplayName("이미 장착한 동일 아이템을 다시 장착하면 기존 상태를 유지한다")
    void equipItemKeepsSameEquippedItem() {
        // given
        MemberItem memberItem = memberItem(10L, 1L, 100L);
        MemberEquippedItem equippedItem = MemberEquippedItem.create(1L, 10L, ItemCategory.HAT);
        given(memberEquippedItemRepository.findByMemberIdAndCategory(1L, ItemCategory.HAT))
                .willReturn(Optional.of(equippedItem));

        // when
        MemberEquippedItem result = avatarItemCommandService.equipItem(
                1L,
                memberItem,
                ItemCategory.HAT
        );

        // then
        assertThat(result).isSameAs(equippedItem);
        assertThat(result.getMemberItemId()).isEqualTo(10L);
        then(memberEquippedItemRepository).should(never()).save(Mockito.any());
    }

    @Test
    @DisplayName("다른 회원이 보유한 아이템은 장착할 수 없다")
    void equipItemRejectsOtherMemberItem() {
        // given
        MemberItem memberItem = memberItem(10L, 2L, 100L);

        // when & then
        assertThatThrownBy(() -> avatarItemCommandService.equipItem(
                1L,
                memberItem,
                ItemCategory.HAT
        ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCESS_DENIED);
        then(memberEquippedItemRepository).should(never())
                .findByMemberIdAndCategory(Mockito.anyLong(), Mockito.any());
        then(memberEquippedItemRepository).should(never()).save(Mockito.any());
    }

    @Test
    @DisplayName("장착 중인 보유 아이템을 해제하면 장착 레코드를 삭제한다")
    void unequipItemDeletesEquippedItem() {
        // given
        MemberItem memberItem = memberItem(10L, 1L, 100L);
        MemberEquippedItem equippedItem = MemberEquippedItem.create(1L, 10L, ItemCategory.HAT);
        given(memberItemRepository.findByIdAndMemberId(10L, 1L))
                .willReturn(Optional.of(memberItem));
        given(memberEquippedItemRepository.findByMemberIdAndMemberItemId(1L, 10L))
                .willReturn(Optional.of(equippedItem));

        // when
        avatarItemCommandService.unequipItem(1L, 10L);

        // then
        then(memberEquippedItemRepository).should().delete(equippedItem);
    }

    @Test
    @DisplayName("이미 해제된 보유 아이템을 다시 해제하면 변경 없이 성공한다")
    void unequipItemKeepsAlreadyUnequippedState() {
        // given
        MemberItem memberItem = memberItem(10L, 1L, 100L);
        given(memberItemRepository.findByIdAndMemberId(10L, 1L))
                .willReturn(Optional.of(memberItem));
        given(memberEquippedItemRepository.findByMemberIdAndMemberItemId(1L, 10L))
                .willReturn(Optional.empty());

        // when
        avatarItemCommandService.unequipItem(1L, 10L);

        // then
        then(memberEquippedItemRepository).should(never()).delete(Mockito.any());
    }

    @Test
    @DisplayName("다른 회원의 보유 아이템은 해제할 수 없다")
    void unequipItemRejectsOtherMemberItem() {
        // given
        given(memberItemRepository.findByIdAndMemberId(10L, 1L))
                .willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> avatarItemCommandService.unequipItem(1L, 10L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCESS_DENIED);
        then(memberEquippedItemRepository).should(never())
                .findByMemberIdAndMemberItemId(Mockito.anyLong(), Mockito.anyLong());
        then(memberEquippedItemRepository).should(never()).delete(Mockito.any());
    }

    @Test
    @DisplayName("다른 회원의 장착 상태는 삭제하지 않는다")
    void unequipItemKeepsOtherMemberEquippedItem() {
        // given
        MemberItem memberItem = memberItem(10L, 1L, 100L);
        given(memberItemRepository.findByIdAndMemberId(10L, 1L))
                .willReturn(Optional.of(memberItem));
        given(memberEquippedItemRepository.findByMemberIdAndMemberItemId(1L, 10L))
                .willReturn(Optional.empty());

        // when
        avatarItemCommandService.unequipItem(1L, 10L);

        // then
        then(memberEquippedItemRepository).should()
                .findByMemberIdAndMemberItemId(1L, 10L);
        then(memberEquippedItemRepository).should(never()).delete(Mockito.any());
    }
}
