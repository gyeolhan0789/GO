package com.wecandoit.item.service;

import static com.wecandoit.item.domain.ItemFixture.item;
import static com.wecandoit.item.domain.MemberItemFixture.memberItem;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.point.repository.PointHistoryRepository;
import com.wecandoit.item.controller.response.ItemPurchaseResponse;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.domain.MemberItem;
import com.wecandoit.item.repository.ItemRepository;
import com.wecandoit.item.repository.MemberItemRepository;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("상점 아이템 구매 서비스")
class ShopItemCommandServiceTest {

    @Mock
    private MemberRepository memberRepository;
    @Mock
    private ItemRepository itemRepository;
    @Mock
    private MemberItemRepository memberItemRepository;
    @Mock
    private PointHistoryRepository pointHistoryRepository;
    private ShopItemCommandService shopItemCommandService;

    @BeforeEach
    void setUp() {
        shopItemCommandService = new ShopItemCommandService(
                memberRepository,
                itemRepository,
                memberItemRepository,
                pointHistoryRepository
        );
    }

    @Test
    @DisplayName("아이템을 구매하면 포인트를 차감하고 보유 아이템을 생성한다")
    void purchaseItemDeductsPointAndCreatesMemberItem() {
        // given
        Member member = member(1L, 5_000L);
        Item item = item(100L, "빨간 모자", ItemCategory.HAT, "https://example.com/hat.png");
        ReflectionTestUtils.setField(item, "price", 1_000L);
        MemberItem savedMemberItem = memberItem(15L, 1L, 100L);
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(member));
        given(itemRepository.findById(100L)).willReturn(Optional.of(item));
        given(memberItemRepository.existsByMemberIdAndItemId(1L, 100L)).willReturn(false);
        given(memberItemRepository.save(any(MemberItem.class))).willReturn(savedMemberItem);

        // when
        ItemPurchaseResponse response = shopItemCommandService.purchaseItem(1L, 100L);

        // then
        assertThat(member.getPoint()).isEqualTo(4_000L);
        assertThat(response).isEqualTo(new ItemPurchaseResponse(15L, 100L, 4_000L));
        InOrder inOrder = inOrder(memberRepository, itemRepository, memberItemRepository);
        then(memberRepository).should(inOrder).findByIdForUpdate(1L);
        then(itemRepository).should(inOrder).findById(100L);
        then(memberItemRepository).should(inOrder).existsByMemberIdAndItemId(1L, 100L);
        then(memberItemRepository).should(inOrder).save(any(MemberItem.class));
        then(pointHistoryRepository).should().save(org.mockito.ArgumentMatchers.argThat(history ->
                history.getMemberId().equals(1L)
                        && history.getReferenceId().equals(100L)
                        && history.getAmount() == -1_000L
        ));
    }

    @Test
    @DisplayName("포인트와 가격이 같으면 아이템 구매에 성공한다")
    void purchaseItemSucceedsWhenPointEqualsPrice() {
        // given
        Member member = member(1L, 1_000L);
        Item item = item(100L, "빨간 모자", ItemCategory.HAT, "https://example.com/hat.png");
        ReflectionTestUtils.setField(item, "price", 1_000L);
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(member));
        given(itemRepository.findById(100L)).willReturn(Optional.of(item));
        given(memberItemRepository.existsByMemberIdAndItemId(1L, 100L)).willReturn(false);
        given(memberItemRepository.save(any(MemberItem.class)))
                .willReturn(memberItem(15L, 1L, 100L));

        // when
        ItemPurchaseResponse response = shopItemCommandService.purchaseItem(1L, 100L);

        // then
        assertThat(member.getPoint()).isZero();
        assertThat(response.remainingPoint()).isZero();
        then(pointHistoryRepository).should().save(any());
    }

    @Test
    @DisplayName("포인트가 부족하면 구매에 실패하고 보유 아이템을 저장하지 않는다")
    void purchaseItemRejectsInsufficientPoint() {
        // given
        Member member = member(1L, 999L);
        Item item = item(100L, "빨간 모자", ItemCategory.HAT, "https://example.com/hat.png");
        ReflectionTestUtils.setField(item, "price", 1_000L);
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(member));
        given(itemRepository.findById(100L)).willReturn(Optional.of(item));
        given(memberItemRepository.existsByMemberIdAndItemId(1L, 100L)).willReturn(false);

        // when & then
        assertErrorCode(() -> shopItemCommandService.purchaseItem(1L, 100L), ErrorCode.INSUFFICIENT_POINT);
        assertThat(member.getPoint()).isEqualTo(999L);
        then(memberItemRepository).should(never()).save(any(MemberItem.class));
        then(pointHistoryRepository).should(never()).save(any());
    }

    @Test
    @DisplayName("이미 보유한 아이템은 중복 구매할 수 없다")
    void purchaseItemRejectsAlreadyOwnedItem() {
        // given
        Member member = member(1L, 5_000L);
        Item item = item(100L, "빨간 모자", ItemCategory.HAT, "https://example.com/hat.png");
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(member));
        given(itemRepository.findById(100L)).willReturn(Optional.of(item));
        given(memberItemRepository.existsByMemberIdAndItemId(1L, 100L)).willReturn(true);

        // when & then
        assertErrorCode(() -> shopItemCommandService.purchaseItem(1L, 100L), ErrorCode.ITEM_ALREADY_OWNED);
        assertThat(member.getPoint()).isEqualTo(5_000L);
        then(memberItemRepository).should(never()).save(any(MemberItem.class));
        then(pointHistoryRepository).should(never()).save(any());
    }

    @Test
    @DisplayName("판매 중지된 아이템은 구매할 수 없다")
    void purchaseItemRejectsUnavailableItem() {
        // given
        Member member = member(1L, 5_000L);
        Item item = item(100L, "빨간 모자", ItemCategory.HAT, "https://example.com/hat.png");
        item.stopSale();
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(member));
        given(itemRepository.findById(100L)).willReturn(Optional.of(item));

        // when & then
        assertErrorCode(
                () -> shopItemCommandService.purchaseItem(1L, 100L),
                ErrorCode.ITEM_NOT_AVAILABLE_FOR_SALE
        );
        assertThat(member.getPoint()).isEqualTo(5_000L);
        then(memberItemRepository).should(never()).existsByMemberIdAndItemId(1L, 100L);
        then(memberItemRepository).should(never()).save(any(MemberItem.class));
        then(pointHistoryRepository).should(never()).save(any());
    }

    @Test
    @DisplayName("존재하지 않는 아이템은 구매할 수 없다")
    void purchaseItemRejectsMissingItem() {
        // given
        Member member = member(1L, 5_000L);
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(member));
        given(itemRepository.findById(100L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(() -> shopItemCommandService.purchaseItem(1L, 100L), ErrorCode.ITEM_NOT_FOUND);
        then(memberItemRepository).should(never()).existsByMemberIdAndItemId(1L, 100L);
        then(memberItemRepository).should(never()).save(any(MemberItem.class));
        then(pointHistoryRepository).should(never()).save(any());
    }

    @Test
    @DisplayName("존재하지 않는 회원은 아이템을 구매할 수 없다")
    void purchaseItemRejectsMissingMember() {
        // given
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(() -> shopItemCommandService.purchaseItem(1L, 100L), ErrorCode.MEMBER_NOT_FOUND);
        then(itemRepository).should(never()).findById(100L);
        then(memberItemRepository).should(never()).save(any(MemberItem.class));
        then(pointHistoryRepository).should(never()).save(any());
    }

    private Member member(Long id, long point) {
        Member member = Member.builder()
                .email("tester@example.com")
                .nickname("테스터")
                .point(point)
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
