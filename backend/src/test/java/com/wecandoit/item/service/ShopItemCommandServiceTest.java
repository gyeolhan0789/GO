package com.wecandoit.item.service;

import static com.wecandoit.item.domain.ItemFixture.item;
import static com.wecandoit.item.domain.MemberItemFixture.memberItem;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.item.controller.response.ItemPurchaseResponse;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.MemberItem;
import com.wecandoit.item.repository.ItemRepository;
import com.wecandoit.item.repository.MemberItemRepository;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("상점 아이템 구매 서비스")
class ShopItemCommandServiceTest {

    private final MemberRepository memberRepository = Mockito.mock(MemberRepository.class);
    private final ItemRepository itemRepository = Mockito.mock(ItemRepository.class);
    private final MemberItemRepository memberItemRepository = Mockito.mock(MemberItemRepository.class);
    private final ShopItemCommandService shopItemCommandService = new ShopItemCommandService(
            memberRepository,
            itemRepository,
            memberItemRepository
    );

    @Test
    @DisplayName("아이템을 구매하면 캐시를 차감하고 보유 아이템을 생성한다")
    void purchaseItemDeductsCashAndCreatesMemberItem() {
        // given
        Member member = member(1L, 5_000L);
        Item item = item(100L, "빨간 모자", "HAT", "https://example.com/hat.png");
        ReflectionTestUtils.setField(item, "price", 1_000L);
        MemberItem savedMemberItem = memberItem(15L, 1L, 100L);
        when(memberRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(member));
        when(itemRepository.findById(100L)).thenReturn(Optional.of(item));
        when(memberItemRepository.existsByMemberIdAndItemId(1L, 100L)).thenReturn(false);
        when(memberItemRepository.save(any(MemberItem.class))).thenReturn(savedMemberItem);

        // when
        ItemPurchaseResponse response = shopItemCommandService.purchaseItem(1L, 100L);

        // then
        assertThat(member.getCash()).isEqualTo(4_000L);
        assertThat(response).isEqualTo(new ItemPurchaseResponse(15L, 100L, 4_000L));
        InOrder inOrder = inOrder(memberRepository, itemRepository, memberItemRepository);
        inOrder.verify(memberRepository).findByIdForUpdate(1L);
        inOrder.verify(itemRepository).findById(100L);
        inOrder.verify(memberItemRepository).existsByMemberIdAndItemId(1L, 100L);
        inOrder.verify(memberItemRepository).save(any(MemberItem.class));
    }

    @Test
    @DisplayName("캐시와 가격이 같으면 아이템 구매에 성공한다")
    void purchaseItemSucceedsWhenCashEqualsPrice() {
        // given
        Member member = member(1L, 1_000L);
        Item item = item(100L, "빨간 모자", "HAT", "https://example.com/hat.png");
        ReflectionTestUtils.setField(item, "price", 1_000L);
        when(memberRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(member));
        when(itemRepository.findById(100L)).thenReturn(Optional.of(item));
        when(memberItemRepository.existsByMemberIdAndItemId(1L, 100L)).thenReturn(false);
        when(memberItemRepository.save(any(MemberItem.class)))
                .thenReturn(memberItem(15L, 1L, 100L));

        // when
        ItemPurchaseResponse response = shopItemCommandService.purchaseItem(1L, 100L);

        // then
        assertThat(member.getCash()).isZero();
        assertThat(response.remainingCash()).isZero();
    }

    @Test
    @DisplayName("캐시가 부족하면 구매에 실패하고 보유 아이템을 저장하지 않는다")
    void purchaseItemRejectsInsufficientCash() {
        // given
        Member member = member(1L, 999L);
        Item item = item(100L, "빨간 모자", "HAT", "https://example.com/hat.png");
        ReflectionTestUtils.setField(item, "price", 1_000L);
        when(memberRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(member));
        when(itemRepository.findById(100L)).thenReturn(Optional.of(item));
        when(memberItemRepository.existsByMemberIdAndItemId(1L, 100L)).thenReturn(false);

        // when, then
        assertErrorCode(() -> shopItemCommandService.purchaseItem(1L, 100L), ErrorCode.INSUFFICIENT_CASH);
        assertThat(member.getCash()).isEqualTo(999L);
        verify(memberItemRepository, never()).save(any(MemberItem.class));
    }

    @Test
    @DisplayName("이미 보유한 아이템은 중복 구매할 수 없다")
    void purchaseItemRejectsAlreadyOwnedItem() {
        // given
        Member member = member(1L, 5_000L);
        Item item = item(100L, "빨간 모자", "HAT", "https://example.com/hat.png");
        when(memberRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(member));
        when(itemRepository.findById(100L)).thenReturn(Optional.of(item));
        when(memberItemRepository.existsByMemberIdAndItemId(1L, 100L)).thenReturn(true);

        // when, then
        assertErrorCode(() -> shopItemCommandService.purchaseItem(1L, 100L), ErrorCode.ITEM_ALREADY_OWNED);
        assertThat(member.getCash()).isEqualTo(5_000L);
        verify(memberItemRepository, never()).save(any(MemberItem.class));
    }

    @Test
    @DisplayName("존재하지 않는 아이템은 구매할 수 없다")
    void purchaseItemRejectsMissingItem() {
        // given
        Member member = member(1L, 5_000L);
        when(memberRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(member));
        when(itemRepository.findById(100L)).thenReturn(Optional.empty());

        // when, then
        assertErrorCode(() -> shopItemCommandService.purchaseItem(1L, 100L), ErrorCode.ITEM_NOT_FOUND);
        verify(memberItemRepository, never()).existsByMemberIdAndItemId(1L, 100L);
        verify(memberItemRepository, never()).save(any(MemberItem.class));
    }

    @Test
    @DisplayName("존재하지 않는 회원은 아이템을 구매할 수 없다")
    void purchaseItemRejectsMissingMember() {
        // given
        when(memberRepository.findByIdForUpdate(1L)).thenReturn(Optional.empty());

        // when, then
        assertErrorCode(() -> shopItemCommandService.purchaseItem(1L, 100L), ErrorCode.MEMBER_NOT_FOUND);
        verify(itemRepository, never()).findById(100L);
        verify(memberItemRepository, never()).save(any(MemberItem.class));
    }

    private Member member(Long id, long cash) {
        Member member = Member.builder()
                .email("tester@example.com")
                .nickname("테스터")
                .cash(cash)
                .build();
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }

    private void assertErrorCode(Runnable action, ErrorCode errorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(errorCode);
    }
}
