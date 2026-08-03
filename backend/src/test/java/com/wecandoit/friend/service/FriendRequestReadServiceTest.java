package com.wecandoit.friend.service;

import com.wecandoit.friend.domain.FriendRequest;
import com.wecandoit.friend.domain.FriendRequestStatus;
import com.wecandoit.friend.repository.FriendRequestRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.friend.dto.ReceivedFriendRequestResponse;
import com.wecandoit.friend.dto.SentFriendRequestResponse;
import com.wecandoit.item.controller.response.CharacterResponse;
import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.ranking.service.RankingCharacterReadService;
import java.time.LocalDateTime;
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
@DisplayName("친구 요청 조회 서비스")
class FriendRequestReadServiceTest {

    @Mock
    private FriendRequestRepository friendRequestRepository;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private RankingCharacterReadService rankingCharacterReadService;
    private FriendRequestReadService friendRequestReadService;

    @BeforeEach
    void setUp() {
        friendRequestReadService = new FriendRequestReadService(
                friendRequestRepository,
                memberRepository,
                rankingCharacterReadService
        );
    }

    @Test
    @DisplayName("받은 대기 친구 요청을 요청자의 캐릭터 정보와 함께 반환한다")
    void getReceivedRequestsReturnsPendingRequests() {
        // given
        Member inviter = member(1L, "보낸사람");
        Member invitee = member(2L, "받는사람");
        FriendRequest friendRequest = FriendRequest.create(inviter, invitee);
        LocalDateTime createdAt = LocalDateTime.of(2026, 7, 19, 12, 0);
        ReflectionTestUtils.setField(friendRequest, "id", 10L);
        ReflectionTestUtils.setField(friendRequest, "createdAt", createdAt);
        PageRequest pageable = PageRequest.of(0, 20);
        given(friendRequestRepository.findAllByInviteeIdAndStatusOrderByCreatedAtDescIdDesc(
                2L,
                FriendRequestStatus.PENDING,
                pageable
        )).willReturn(new SliceImpl<>(List.of(friendRequest), pageable, false));
        EquippedItemResponse equippedItem = new EquippedItemResponse(
                11L,
                101L,
                "파란 모자",
                ItemCategory.HAT,
                "https://example.com/blue-hat.png"
        );
        given(rankingCharacterReadService.getCharactersByMemberIds(List.of(1L)))
                .willReturn(Map.of(1L, new CharacterResponse(
                        1L,
                        "보낸사람",
                        Gender.MALE,
                        "https://example.com/male.png",
                        List.of(equippedItem)
                )));

        // when
        SliceResponse<ReceivedFriendRequestResponse> responses =
                friendRequestReadService.getReceivedRequests(2L, pageable);

        // then
        assertThat(responses.content()).containsExactly(
                new ReceivedFriendRequestResponse(
                        10L,
                        1L,
                        "보낸사람",
                        createdAt,
                        Gender.MALE,
                        "https://example.com/male.png",
                        List.of(equippedItem)
                )
        );
        assertThat(responses.hasNext()).isFalse();
        then(rankingCharacterReadService).should().getCharactersByMemberIds(List.of(1L));
    }

    @Test
    @DisplayName("보낸 대기 친구 요청을 대상 회원 정보와 함께 반환한다")
    void getSentRequestsReturnsInviteeInformation() {
        // given
        Member inviter = member(1L, "보낸사람");
        Member invitee = member(2L, "받는사람");
        FriendRequest friendRequest = FriendRequest.create(inviter, invitee);
        LocalDateTime createdAt = LocalDateTime.of(2026, 7, 27, 10, 0);
        ReflectionTestUtils.setField(friendRequest, "id", 10L);
        ReflectionTestUtils.setField(friendRequest, "createdAt", createdAt);
        PageRequest pageable = PageRequest.of(0, 20);
        given(memberRepository.existsById(1L)).willReturn(true);
        given(friendRequestRepository.findPendingSentRequests(1L, pageable))
                .willReturn(new SliceImpl<>(List.of(friendRequest), pageable, false));

        // when
        SliceResponse<SentFriendRequestResponse> responses =
                friendRequestReadService.getSentRequests(1L, pageable);

        // then
        assertThat(responses.content()).containsExactly(
                new SentFriendRequestResponse(10L, 2L, "받는사람", createdAt)
        );
    }

    @Test
    @DisplayName("보낸 대기 친구 요청이 없으면 빈 목록을 반환한다")
    void getSentRequestsReturnsEmptyList() {
        // given
        PageRequest pageable = PageRequest.of(0, 20);
        given(memberRepository.existsById(1L)).willReturn(true);
        given(friendRequestRepository.findPendingSentRequests(1L, pageable))
                .willReturn(new SliceImpl<>(List.of(), pageable, false));

        // when
        SliceResponse<SentFriendRequestResponse> responses =
                friendRequestReadService.getSentRequests(1L, pageable);

        // then
        assertThat(responses.content()).isEmpty();
        assertThat(responses.hasNext()).isFalse();
    }

    @Test
    @DisplayName("로그인 회원이 존재하지 않으면 회원 없음 예외가 발생한다")
    void getSentRequestsRejectsMissingMember() {
        // given
        given(memberRepository.existsById(1L)).willReturn(false);

        // when & then
        assertThatThrownBy(() -> friendRequestReadService.getSentRequests(
                1L,
                PageRequest.of(0, 20)
        ))
                .isInstanceOfSatisfying(CustomException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.MEMBER_NOT_FOUND));
    }

    private Member member(Long id, String nickname) {
        Member member = Member.create(nickname + "@example.com", "password", nickname);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }
}
