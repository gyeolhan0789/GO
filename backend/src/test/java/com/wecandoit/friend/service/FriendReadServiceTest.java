package com.wecandoit.friend.service;

import com.wecandoit.avatar.service.AvatarReadService;
import com.wecandoit.friend.domain.Friend;
import com.wecandoit.friend.repository.FriendRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.friend.dto.FriendResponse;
import com.wecandoit.history.repository.MemberHistoryRepository;
import com.wecandoit.history.repository.WeeklyRankingSummary;
import com.wecandoit.item.controller.response.AvatarResponse;
import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import java.util.List;
import java.util.Map;
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
    private AvatarReadService avatarReadService;
    private FriendReadService friendReadService;

    @BeforeEach
    void setUp() {
        friendReadService = new FriendReadService(
                friendRepository,
                memberHistoryRepository,
                avatarReadService
        );
    }

    @Test
    @DisplayName("관계 저장 방향과 관계없이 친구의 걸음 수와 아바타 정보를 반환한다")
    void getFriendsReturnsOtherMemberFromBothDirections() {
        // given
        Member loginMember = member(2L, "로그인회원");
        Member smallerIdFriend = member(1L, "첫번째친구", Gender.FEMALE);
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
        EquippedItemResponse equippedItem = new EquippedItemResponse(
                10L,
                100L,
                "빨간 모자",
                ItemCategory.HAT,
                "https://example.com/hat.png"
        );
        given(avatarReadService.getAvatars(List.of(smallerIdFriend, largerIdFriend)))
                .willReturn(Map.of(
                        1L,
                        new AvatarResponse(
                                1L,
                                "첫번째친구",
                                Gender.FEMALE,
                                "https://example.com/female.png",
                                List.of(equippedItem)
                        ),
                        3L,
                        new AvatarResponse(
                                3L,
                                "두번째친구",
                                Gender.MALE,
                                "https://example.com/male.png",
                                List.of()
                        )
                ));

        // when
        SliceResponse<FriendResponse> responses = friendReadService.getFriends(2L, pageable);

        // then
        assertThat(responses.content())
                .extracting(
                        FriendResponse::memberId,
                        FriendResponse::nickname,
                        FriendResponse::weeklySteps,
                        FriendResponse::gender,
                        FriendResponse::defaultImageUrl
                )
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(
                                1L,
                                "첫번째친구",
                                0L,
                                Gender.FEMALE,
                                "https://example.com/female.png"
                        ),
                        org.assertj.core.groups.Tuple.tuple(
                                3L,
                                "두번째친구",
                                2_500L,
                                Gender.MALE,
                                "https://example.com/male.png"
                        )
                );
        assertThat(responses.content().getFirst().equippedItems()).containsExactly(equippedItem);
        assertThat(responses.content().get(1).equippedItems()).isEmpty();
        assertThat(responses.hasNext()).isFalse();
        then(memberHistoryRepository).should().findWeeklyStepsByMemberIds(
                eq(List.of(1L, 3L)),
                any(),
                any()
        );
        then(avatarReadService).should()
                .getAvatars(List.of(smallerIdFriend, largerIdFriend));
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
        then(avatarReadService).shouldHaveNoInteractions();
    }

    private Member member(Long id, String nickname) {
        return member(id, nickname, Gender.MALE);
    }

    private Member member(Long id, String nickname, Gender gender) {
        Member member = Member.create(nickname + "@example.com", "password", nickname, null, gender);
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
}
