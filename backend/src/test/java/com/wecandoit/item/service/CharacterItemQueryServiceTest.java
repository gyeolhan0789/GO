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
import com.wecandoit.item.controller.response.CharacterResponse;
import com.wecandoit.item.controller.response.MemberItemResponse;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.domain.MemberEquippedItem;
import com.wecandoit.item.domain.MemberItem;
import com.wecandoit.item.repository.ItemRepository;
import com.wecandoit.item.repository.MemberEquippedItemRepository;
import com.wecandoit.item.repository.MemberItemRepository;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("캐릭터 아이템 조회 서비스")
class CharacterItemQueryServiceTest {

    private final MemberRepository memberRepository = Mockito.mock(MemberRepository.class);
    private final MemberEquippedItemRepository memberEquippedItemRepository = Mockito.mock(
            MemberEquippedItemRepository.class
    );
    private final MemberItemRepository memberItemRepository = Mockito.mock(MemberItemRepository.class);
    private final ItemRepository itemRepository = Mockito.mock(ItemRepository.class);
    private final CharacterItemQueryService characterItemQueryService = new CharacterItemQueryService(
            memberRepository,
            memberEquippedItemRepository,
            memberItemRepository,
            itemRepository
    );

    @Test
    @DisplayName("보유 아이템 목록을 조회하면 원본 아이템 정보를 함께 반환한다")
    void getMyItemsReturnsMemberItems() {
        // given
        Member member = member(1L, "테스터");
        MemberItem hat = memberItem(10L, 1L, 100L);
        MemberItem top = memberItem(20L, 1L, 200L);
        Item hatItem = item(100L, "빨간 모자", "HAT", "https://example.com/hat.png");
        Item topItem = item(200L, "파란 상의", "TOP", "https://example.com/top.png");
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(memberItemRepository.findAllByMemberId(1L)).thenReturn(List.of(hat, top));
        when(itemRepository.findAllById(List.of(100L, 200L))).thenReturn(List.of(hatItem, topItem));

        // when
        List<MemberItemResponse> responses = characterItemQueryService.getMyItems(1L);

        // then
        assertThat(responses)
                .extracting("memberItemId", "itemId", "name", "category", "imageUrl")
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(
                                10L,
                                100L,
                                "빨간 모자",
                                "HAT",
                                "https://example.com/hat.png"
                        ),
                        org.assertj.core.groups.Tuple.tuple(
                                20L,
                                200L,
                                "파란 상의",
                                "TOP",
                                "https://example.com/top.png"
                        )
                );
        verify(itemRepository).findAllById(List.of(100L, 200L));
    }

    @Test
    @DisplayName("보유 아이템이 없으면 빈 목록을 반환한다")
    void getMyItemsReturnsEmptyList() {
        // given
        Member member = member(1L, "테스터");
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(memberItemRepository.findAllByMemberId(1L)).thenReturn(List.of());

        // when
        List<MemberItemResponse> responses = characterItemQueryService.getMyItems(1L);

        // then
        assertThat(responses).isEmpty();
        verify(itemRepository, never()).findAllById(Mockito.anyIterable());
    }

    @Test
    @DisplayName("존재하지 않는 회원의 보유 아이템을 조회하면 실패한다")
    void getMyItemsRejectsMissingMember() {
        // given
        when(memberRepository.findById(1L)).thenReturn(Optional.empty());

        // when, then
        assertThatThrownBy(() -> characterItemQueryService.getMyItems(1L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
        verify(memberItemRepository, never()).findAllByMemberId(Mockito.anyLong());
        verify(itemRepository, never()).findAllById(Mockito.anyIterable());
    }

    @Test
    @DisplayName("카테고리로 보유 아이템을 조회하면 해당 카테고리만 반환한다")
    void getMyItemsByCategoryReturnsMatchingItems() {
        // given
        Member member = member(1L, "테스터");
        MemberItem hat = memberItem(10L, 1L, 100L);
        MemberItem top = memberItem(20L, 1L, 200L);
        Item hatItem = item(100L, "빨간 모자", "HAT", "https://example.com/hat.png");
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(memberItemRepository.findAllByMemberId(1L)).thenReturn(List.of(hat, top));
        when(itemRepository.findAllByIdInAndCategory(List.of(100L, 200L), "HAT"))
                .thenReturn(List.of(hatItem));

        // when
        List<MemberItemResponse> responses = characterItemQueryService.getMyItems(1L, "HAT");

        // then
        assertThat(responses)
                .extracting(MemberItemResponse::memberItemId, MemberItemResponse::category)
                .containsExactly(org.assertj.core.groups.Tuple.tuple(10L, "HAT"));
        verify(itemRepository).findAllByIdInAndCategory(List.of(100L, 200L), "HAT");
        verify(itemRepository, never()).findAllById(Mockito.anyIterable());
    }

    @Test
    @DisplayName("카테고리에 해당하는 보유 아이템이 없으면 빈 목록을 반환한다")
    void getMyItemsByCategoryReturnsEmptyList() {
        // given
        Member member = member(1L, "테스터");
        MemberItem hat = memberItem(10L, 1L, 100L);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(memberItemRepository.findAllByMemberId(1L)).thenReturn(List.of(hat));
        when(itemRepository.findAllByIdInAndCategory(List.of(100L), "TOP"))
                .thenReturn(List.of());

        // when
        List<MemberItemResponse> responses = characterItemQueryService.getMyItems(1L, "TOP");

        // then
        assertThat(responses).isEmpty();
    }

    @Test
    @DisplayName("유효하지 않은 카테고리로 조회하면 실패한다")
    void getMyItemsByCategoryRejectsInvalidCategory() {
        // when, then
        assertThatThrownBy(() -> characterItemQueryService.getMyItems(1L, "UNKNOWN"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_ITEM_CATEGORY);
        verify(memberRepository, never()).findById(Mockito.anyLong());
        verify(memberItemRepository, never()).findAllByMemberId(Mockito.anyLong());
    }

    @Test
    @DisplayName("소문자 카테고리로 조회하면 실패한다")
    void getMyItemsByCategoryRejectsLowercaseCategory() {
        // when, then
        assertThatThrownBy(() -> characterItemQueryService.getMyItems(1L, "hat"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_ITEM_CATEGORY);
        verify(memberRepository, never()).findById(Mockito.anyLong());
        verify(memberItemRepository, never()).findAllByMemberId(Mockito.anyLong());
    }

    @Test
    @DisplayName("내 캐릭터를 조회하면 회원 정보와 장착 아이템을 반환한다")
    void getMyCharacterReturnsMemberAndEquippedItems() {
        // given
        Member member = member(1L, "테스터");
        MemberEquippedItem equippedHat = MemberEquippedItem.create(1L, 10L, ItemCategory.HAT);
        MemberEquippedItem equippedTop = MemberEquippedItem.create(1L, 20L, ItemCategory.TOP);
        MemberItem hat = memberItem(10L, 1L, 100L);
        MemberItem top = memberItem(20L, 1L, 200L);
        Item hatItem = item(100L, "빨간 모자", "HAT", "https://example.com/hat.png");
        Item topItem = item(200L, "파란 상의", "TOP", "https://example.com/top.png");
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(memberEquippedItemRepository.findAllByMemberId(1L))
                .thenReturn(List.of(equippedHat, equippedTop));
        when(memberItemRepository.findAllById(List.of(10L, 20L))).thenReturn(List.of(hat, top));
        when(itemRepository.findAllById(Mockito.anyIterable())).thenReturn(List.of(hatItem, topItem));

        // when
        CharacterResponse response = characterItemQueryService.getMyCharacter(1L);

        // then
        assertThat(response.memberId()).isEqualTo(1L);
        assertThat(response.nickname()).isEqualTo("테스터");
        assertThat(response.equippedItems())
                .extracting("memberItemId", "itemId", "name", "category", "imageUrl")
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(
                                10L,
                                100L,
                                "빨간 모자",
                                ItemCategory.HAT,
                                "https://example.com/hat.png"
                        ),
                        org.assertj.core.groups.Tuple.tuple(
                                20L,
                                200L,
                                "파란 상의",
                                ItemCategory.TOP,
                                "https://example.com/top.png"
                        )
                );
    }

    @Test
    @DisplayName("장착한 아이템이 없으면 빈 장착 목록을 반환한다")
    void getMyCharacterReturnsEmptyEquippedItems() {
        // given
        Member member = member(1L, "테스터");
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(memberEquippedItemRepository.findAllByMemberId(1L)).thenReturn(List.of());

        // when
        CharacterResponse response = characterItemQueryService.getMyCharacter(1L);

        // then
        assertThat(response.equippedItems()).isEmpty();
        verify(memberItemRepository, never()).findAllById(Mockito.anyIterable());
        verify(itemRepository, never()).findAllById(Mockito.anyIterable());
    }

    @Test
    @DisplayName("존재하지 않는 회원의 캐릭터를 조회하면 실패한다")
    void getMyCharacterRejectsMissingMember() {
        // given
        when(memberRepository.findById(1L)).thenReturn(Optional.empty());

        // when, then
        assertThatThrownBy(() -> characterItemQueryService.getMyCharacter(1L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
        verify(memberEquippedItemRepository, never()).findAllByMemberId(Mockito.anyLong());
    }

    private Member member(Long id, String nickname) {
        Member member = Member.create("member@example.com", "password", nickname);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }
}
