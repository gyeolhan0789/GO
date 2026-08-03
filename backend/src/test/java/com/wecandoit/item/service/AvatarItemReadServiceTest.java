package com.wecandoit.item.service;

import com.wecandoit.avatar.service.AvatarReadService;
import static com.wecandoit.item.domain.ItemFixture.item;
import static com.wecandoit.item.domain.MemberItemFixture.memberItem;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.item.controller.response.AvatarResponse;
import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.item.controller.response.MemberItemResponse;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.domain.MemberItem;
import com.wecandoit.item.repository.ItemRepository;
import com.wecandoit.item.repository.MemberItemRepository;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.repository.MemberRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("아바타 아이템 조회 서비스")
class AvatarItemReadServiceTest {

    @Mock
    private MemberRepository memberRepository;
    @Mock
    private MemberItemRepository memberItemRepository;
    @Mock
    private ItemRepository itemRepository;
    @Mock
    private AvatarReadService avatarReadService;
    private AvatarItemReadService avatarItemReadService;

    @BeforeEach
    void setUp() {
        avatarItemReadService = new AvatarItemReadService(
                memberRepository,
                memberItemRepository,
                itemRepository,
                avatarReadService
        );
    }

    @Test
    @DisplayName("보유 아이템 목록을 조회하면 원본 아이템 정보를 함께 반환한다")
    void getMyItemsReturnsMemberItems() {
        // given
        Member member = member(1L, "테스터");
        MemberItem hat = memberItem(10L, 1L, 100L);
        MemberItem top = memberItem(20L, 1L, 200L);
        Item hatItem = item(100L, "빨간 모자", "HAT", "https://example.com/hat.png");
        Item topItem = item(200L, "파란 상의", "TOP", "https://example.com/top.png");
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));
        given(memberItemRepository.findAllByMemberId(1L)).willReturn(List.of(hat, top));
        given(itemRepository.findAllById(List.of(100L, 200L))).willReturn(List.of(hatItem, topItem));

        // when
        List<MemberItemResponse> responses = avatarItemReadService.getMyItems(1L);

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
        then(itemRepository).should().findAllById(List.of(100L, 200L));
    }

    @Test
    @DisplayName("보유 아이템이 없으면 빈 목록을 반환한다")
    void getMyItemsReturnsEmptyList() {
        // given
        Member member = member(1L, "테스터");
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));
        given(memberItemRepository.findAllByMemberId(1L)).willReturn(List.of());

        // when
        List<MemberItemResponse> responses = avatarItemReadService.getMyItems(1L);

        // then
        assertThat(responses).isEmpty();
        then(itemRepository).should(never()).findAllById(Mockito.anyIterable());
    }

    @Test
    @DisplayName("존재하지 않는 회원의 보유 아이템을 조회하면 실패한다")
    void getMyItemsRejectsMissingMember() {
        // given
        given(memberRepository.findById(1L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> avatarItemReadService.getMyItems(1L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
        then(memberItemRepository).should(never()).findAllByMemberId(Mockito.anyLong());
        then(itemRepository).should(never()).findAllById(Mockito.anyIterable());
    }

    @Test
    @DisplayName("카테고리로 보유 아이템을 조회하면 해당 카테고리만 반환한다")
    void getMyItemsByCategoryReturnsMatchingItems() {
        // given
        Member member = member(1L, "테스터");
        MemberItem hat = memberItem(10L, 1L, 100L);
        MemberItem top = memberItem(20L, 1L, 200L);
        Item hatItem = item(100L, "빨간 모자", "HAT", "https://example.com/hat.png");
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));
        given(memberItemRepository.findAllByMemberId(1L)).willReturn(List.of(hat, top));
        given(itemRepository.findAllByIdInAndCategory(List.of(100L, 200L), "HAT"))
                .willReturn(List.of(hatItem));

        // when
        List<MemberItemResponse> responses = avatarItemReadService.getMyItems(1L, "HAT");

        // then
        assertThat(responses)
                .extracting(MemberItemResponse::memberItemId, MemberItemResponse::category)
                .containsExactly(org.assertj.core.groups.Tuple.tuple(10L, "HAT"));
        then(itemRepository).should().findAllByIdInAndCategory(List.of(100L, 200L), "HAT");
        then(itemRepository).should(never()).findAllById(Mockito.anyIterable());
    }

    @Test
    @DisplayName("카테고리에 해당하는 보유 아이템이 없으면 빈 목록을 반환한다")
    void getMyItemsByCategoryReturnsEmptyList() {
        // given
        Member member = member(1L, "테스터");
        MemberItem hat = memberItem(10L, 1L, 100L);
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));
        given(memberItemRepository.findAllByMemberId(1L)).willReturn(List.of(hat));
        given(itemRepository.findAllByIdInAndCategory(List.of(100L), "TOP"))
                .willReturn(List.of());

        // when
        List<MemberItemResponse> responses = avatarItemReadService.getMyItems(1L, "TOP");

        // then
        assertThat(responses).isEmpty();
    }

    @Test
    @DisplayName("유효하지 않은 카테고리로 조회하면 실패한다")
    void getMyItemsByCategoryRejectsInvalidCategory() {
        // when & then
        assertThatThrownBy(() -> avatarItemReadService.getMyItems(1L, "UNKNOWN"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_ITEM_CATEGORY);
        then(memberRepository).should(never()).findById(Mockito.anyLong());
        then(memberItemRepository).should(never()).findAllByMemberId(Mockito.anyLong());
    }

    @Test
    @DisplayName("소문자 카테고리로 조회하면 실패한다")
    void getMyItemsByCategoryRejectsLowercaseCategory() {
        // when & then
        assertThatThrownBy(() -> avatarItemReadService.getMyItems(1L, "hat"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_ITEM_CATEGORY);
        then(memberRepository).should(never()).findById(Mockito.anyLong());
        then(memberItemRepository).should(never()).findAllByMemberId(Mockito.anyLong());
    }

    @Test
    @DisplayName("내 아바타를 조회하면 회원 정보와 장착 아이템을 반환한다")
    void getMyAvatarReturnsMemberAndEquippedItems() {
        // given
        Member member = member(1L, "테스터");
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));
        given(avatarReadService.getAvatars(List.of(member))).willReturn(Map.of(
                1L,
                new AvatarResponse(
                        1L,
                        "테스터",
                        Gender.MALE,
                        "/uploads/test/avatars/male/default.png",
                        List.of(
                                new EquippedItemResponse(
                                        10L,
                                        100L,
                                        "빨간 모자",
                                        ItemCategory.HAT,
                                        "https://example.com/hat.png"
                                ),
                                new EquippedItemResponse(
                                        20L,
                                        200L,
                                        "파란 상의",
                                        ItemCategory.TOP,
                                        "https://example.com/top.png"
                                )
                        )
                )
        ));

        // when
        AvatarResponse response = avatarItemReadService.getMyAvatar(1L);

        // then
        assertThat(response.memberId()).isEqualTo(1L);
        assertThat(response.nickname()).isEqualTo("테스터");
        assertThat(response.gender()).isEqualTo(Gender.MALE);
        assertThat(response.defaultImageUrl())
                .isEqualTo("/uploads/test/avatars/male/default.png");
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
    void getMyAvatarReturnsEmptyEquippedItems() {
        // given
        Member member = member(1L, "테스터");
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));
        given(avatarReadService.getAvatars(List.of(member))).willReturn(Map.of(
                1L,
                new AvatarResponse(
                        1L,
                        "테스터",
                        Gender.MALE,
                        "/uploads/test/avatars/male/default.png",
                        List.of()
                )
        ));

        // when
        AvatarResponse response = avatarItemReadService.getMyAvatar(1L);

        // then
        assertThat(response.equippedItems()).isEmpty();
        then(avatarReadService).should().getAvatars(List.of(member));
    }

    @Test
    @DisplayName("존재하지 않는 회원의 아바타를 조회하면 실패한다")
    void getMyAvatarRejectsMissingMember() {
        // given
        given(memberRepository.findById(1L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> avatarItemReadService.getMyAvatar(1L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
        then(avatarReadService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("기본 아바타 에셋이 아직 등록되지 않아도 기존 아바타 정보를 조회한다")
    void getMyAvatarReturnsAvatarWithoutDefaultAsset() {
        // given
        Member member = member(1L, "테스터");
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));
        given(avatarReadService.getAvatars(List.of(member))).willReturn(Map.of(
                1L,
                new AvatarResponse(
                        1L,
                        "테스터",
                        Gender.MALE,
                        null,
                        List.of()
                )
        ));

        // when
        AvatarResponse response = avatarItemReadService.getMyAvatar(1L);

        // then
        assertThat(response.defaultImageUrl()).isNull();
        assertThat(response.equippedItems()).isEmpty();
    }

    private Member member(Long id, String nickname) {
        Member member = Member.create("member@example.com", "password", nickname);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }
}
