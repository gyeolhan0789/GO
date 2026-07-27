package com.wecandoit.friend.service;

import com.wecandoit.friend.domain.Friend;
import com.wecandoit.friend.repository.FriendRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static com.wecandoit.item.domain.ItemFixture.item;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.friend.dto.FriendResponse;
import com.wecandoit.history.repository.MemberHistoryRepository;
import com.wecandoit.history.repository.WeeklyRankingSummary;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.domain.MemberEquippedItem;
import com.wecandoit.item.domain.MemberItem;
import com.wecandoit.item.repository.ItemRepository;
import com.wecandoit.item.repository.MemberEquippedItemRepository;
import com.wecandoit.item.repository.MemberItemRepository;
import com.wecandoit.member.domain.Member;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.SliceImpl;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("친구 조회 서비스")
class FriendReadServiceTest {

    @Mock
    private FriendRepository friendRepository;
    @Mock
    private MemberHistoryRepository memberHistoryRepository;
    @Mock
    private MemberEquippedItemRepository memberEquippedItemRepository;
    @Mock
    private MemberItemRepository memberItemRepository;
    @Mock
    private ItemRepository itemRepository;
    private FriendReadService friendReadService;

    @BeforeEach
    void setUp() {
        friendReadService = new FriendReadService(
                friendRepository,
                memberHistoryRepository,
                memberEquippedItemRepository,
                memberItemRepository,
                itemRepository
        );
    }

    @Test
    @DisplayName("관계 저장 방향과 관계없이 상대 회원을 친구 목록으로 반환한다")
    void getFriendsReturnsOtherMemberFromBothDirections() {
        // given
        Member loginMember = member(2L, "로그인회원");
        Member smallerIdFriend = member(1L, "첫번째친구");
        Member largerIdFriend = member(3L, "두번째친구");
        PageRequest pageable = PageRequest.of(0, 2);
        given(friendRepository.findAllByMemberId(2L, pageable)).willReturn(new SliceImpl<>(List.of(
                Friend.create(loginMember, smallerIdFriend),
                Friend.create(loginMember, largerIdFriend)
        ), pageable, false));
        given(memberHistoryRepository.findWeeklyStepsByMemberIds(
                eq(List.of(1L, 3L)),
                any(),
                any()
        )).willReturn(List.of(
                weeklySteps(1L, 0),
                weeklySteps(3L, 2_500)
        ));
        MemberItem memberItem = memberItem(10L, 1L, 100L);
        MemberEquippedItem equippedItem =
                MemberEquippedItem.create(1L, 10L, ItemCategory.HAT);
        Item item = item(
                100L,
                "빨간 모자",
                ItemCategory.HAT.name(),
                "https://example.com/hat.png"
        );
        given(memberEquippedItemRepository.findAllByMemberIdIn(List.of(1L, 3L)))
                .willReturn(List.of(equippedItem));
        given(memberItemRepository.findAllById(List.of(10L))).willReturn(List.of(memberItem));
        given(itemRepository.findAllById(List.of(100L))).willReturn(List.of(item));

        // when
        SliceResponse<FriendResponse> responses = friendReadService.getFriends(2L, pageable);

        // then
        assertThat(responses.content())
                .extracting(
                        FriendResponse::memberId,
                        FriendResponse::nickname,
                        FriendResponse::weeklySteps
                )
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(1L, "첫번째친구", 0L),
                        org.assertj.core.groups.Tuple.tuple(3L, "두번째친구", 2_500L)
                );
        assertThat(responses.content().getFirst().equippedItems()).hasSize(1);
        assertThat(responses.content().get(1).equippedItems()).isEmpty();
        assertThat(responses.hasNext()).isFalse();
        then(memberHistoryRepository).should().findWeeklyStepsByMemberIds(
                eq(List.of(1L, 3L)),
                any(),
                any()
        );
        then(memberEquippedItemRepository).should().findAllByMemberIdIn(List.of(1L, 3L));
        then(memberItemRepository).should().findAllById(List.of(10L));
        then(itemRepository).should().findAllById(List.of(100L));
    }

    @Test
    @DisplayName("친구가 없으면 부가 정보 저장소를 조회하지 않고 빈 Slice를 반환한다")
    void getFriendsReturnsEmptySliceWithoutDetailQueries() {
        // given
        PageRequest pageable = PageRequest.of(0, 20);
        given(friendRepository.findAllByMemberId(1L, pageable))
                .willReturn(new SliceImpl<>(List.of(), pageable, false));

        // when
        SliceResponse<FriendResponse> responses = friendReadService.getFriends(1L, pageable);

        // then
        assertThat(responses.content()).isEmpty();
        assertThat(responses.hasNext()).isFalse();
        then(memberHistoryRepository).shouldHaveNoInteractions();
        then(memberEquippedItemRepository).shouldHaveNoInteractions();
        then(memberItemRepository).shouldHaveNoInteractions();
        then(itemRepository).shouldHaveNoInteractions();
    }

    private Member member(Long id, String nickname) {
        Member member = Member.create(nickname + "@example.com", "password", nickname);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }

    private WeeklyRankingSummary weeklySteps(Long memberId, long weeklySteps) {
        return new WeeklyRankingSummary() {
            @Override
            public Long getMemberId() {
                return memberId;
            }

            @Override
            public String getNickname() {
                return "";
            }

            @Override
            public long getWeeklySteps() {
                return weeklySteps;
            }
        };
    }

    private MemberItem memberItem(Long id, Long memberId, Long itemId) {
        MemberItem memberItem = MemberItem.create(memberId, itemId);
        ReflectionTestUtils.setField(memberItem, "id", id);
        return memberItem;
    }

}
