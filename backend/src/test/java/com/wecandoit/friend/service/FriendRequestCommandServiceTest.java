package com.wecandoit.friend.service;

import com.wecandoit.friend.domain.FriendRequest;
import com.wecandoit.friend.domain.FriendRequestStatus;
import com.wecandoit.friend.repository.FriendRequestRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.friend.domain.Friend;
import com.wecandoit.friend.repository.FriendRepository;
import com.wecandoit.friend.dto.SendFriendRequest;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("친구 요청 명령 서비스")
class FriendRequestCommandServiceTest {

    private final FriendRequestRepository friendRequestRepository = Mockito.mock(FriendRequestRepository.class);
    private final FriendRepository friendRepository = Mockito.mock(FriendRepository.class);
    private final MemberRepository memberRepository = Mockito.mock(MemberRepository.class);
    private final FriendRequestCommandService friendRequestCommandService = new FriendRequestCommandService(
            friendRequestRepository,
            friendRepository,
            memberRepository
    );

    private Member inviter;
    private Member invitee;

    @BeforeEach
    void setUp() {
        inviter = member(1L, "보낸사람");
        invitee = member(2L, "받는사람");
        when(memberRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(inviter));
        when(memberRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(invitee));
    }

    @Test
    @DisplayName("친구가 아니고 대기 요청이 없으면 친구 요청을 생성한다")
    void sendRequestCreatesPendingRequest() {
        // given
        when(friendRepository.existsBetween(1L, 2L)).thenReturn(false);
        when(friendRequestRepository.findPendingBetween(1L, 2L)).thenReturn(Optional.empty());

        // when
        friendRequestCommandService.sendRequest(1L, new SendFriendRequest(2L));

        // then
        ArgumentCaptor<FriendRequest> captor = ArgumentCaptor.forClass(FriendRequest.class);
        verify(friendRequestRepository).save(captor.capture());
        assertThat(captor.getValue().getInviter()).isEqualTo(inviter);
        assertThat(captor.getValue().getInvitee()).isEqualTo(invitee);
        assertThat(captor.getValue().getStatus()).isEqualTo(FriendRequestStatus.PENDING);
    }

    @Test
    @DisplayName("자기 자신에게 친구 요청을 보내면 실패한다")
    void sendRequestRejectsSelfRequest() {
        // when, then
        assertErrorCode(
                () -> friendRequestCommandService.sendRequest(1L, new SendFriendRequest(1L)),
                ErrorCode.SELF_FRIEND_REQUEST
        );
        verify(friendRequestRepository, never()).save(Mockito.any());
    }

    @Test
    @DisplayName("이미 친구인 회원에게 친구 요청을 보내면 실패한다")
    void sendRequestRejectsExistingFriend() {
        // given
        when(friendRepository.existsBetween(1L, 2L)).thenReturn(true);

        // when, then
        assertErrorCode(
                () -> friendRequestCommandService.sendRequest(1L, new SendFriendRequest(2L)),
                ErrorCode.ALREADY_FRIENDS
        );
        verify(friendRequestRepository, never()).save(Mockito.any());
    }

    @Test
    @DisplayName("같은 방향의 대기 친구 요청이 있으면 실패한다")
    void sendRequestRejectsDuplicatePendingRequest() {
        // given
        FriendRequest existingRequest = FriendRequest.create(inviter, invitee);
        when(friendRequestRepository.findPendingBetween(1L, 2L)).thenReturn(Optional.of(existingRequest));

        // when, then
        assertErrorCode(
                () -> friendRequestCommandService.sendRequest(1L, new SendFriendRequest(2L)),
                ErrorCode.DUPLICATE_FRIEND_REQUEST
        );
    }

    @Test
    @DisplayName("반대 방향의 대기 친구 요청이 있으면 실패한다")
    void sendRequestRejectsReversePendingRequest() {
        // given
        FriendRequest reverseRequest = FriendRequest.create(invitee, inviter);
        when(friendRequestRepository.findPendingBetween(1L, 2L)).thenReturn(Optional.of(reverseRequest));

        // when, then
        assertErrorCode(
                () -> friendRequestCommandService.sendRequest(1L, new SendFriendRequest(2L)),
                ErrorCode.REVERSE_FRIEND_REQUEST_EXISTS
        );
    }

    @Test
    @DisplayName("수신자가 대기 중인 친구 요청을 수락하면 친구 관계를 생성한다")
    void acceptRequestCreatesFriend() {
        // given
        FriendRequest friendRequest = friendRequest(10L, inviter, invitee);
        when(friendRequestRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(friendRequest));
        when(friendRepository.existsBetween(1L, 2L)).thenReturn(false);

        // when
        friendRequestCommandService.acceptRequest(2L, 10L);

        // then
        assertThat(friendRequest.getStatus()).isEqualTo(FriendRequestStatus.ACCEPTED);
        verify(friendRepository).save(Mockito.any(Friend.class));
    }

    @Test
    @DisplayName("친구 요청 수신자가 아니면 수락할 수 없다")
    void acceptRequestRejectsNonInvitee() {
        // given
        FriendRequest friendRequest = friendRequest(10L, inviter, invitee);
        when(friendRequestRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(friendRequest));

        // when, then
        assertErrorCode(
                () -> friendRequestCommandService.acceptRequest(1L, 10L),
                ErrorCode.FRIEND_REQUEST_FORBIDDEN
        );
        verify(friendRepository, never()).save(Mockito.any());
    }

    @Test
    @DisplayName("이미 처리된 친구 요청은 다시 수락할 수 없다")
    void acceptRequestRejectsProcessedRequest() {
        // given
        FriendRequest friendRequest = friendRequest(10L, inviter, invitee);
        friendRequest.reject();
        when(friendRequestRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(friendRequest));

        // when, then
        assertErrorCode(
                () -> friendRequestCommandService.acceptRequest(2L, 10L),
                ErrorCode.FRIEND_REQUEST_ALREADY_PROCESSED
        );
    }

    @Test
    @DisplayName("수신자가 대기 중인 친구 요청을 거절하면 거절 상태로 보존한다")
    void rejectRequestChangesStatus() {
        // given
        FriendRequest friendRequest = friendRequest(10L, inviter, invitee);
        when(friendRequestRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(friendRequest));

        // when
        friendRequestCommandService.rejectRequest(2L, 10L);

        // then
        assertThat(friendRequest.getStatus()).isEqualTo(FriendRequestStatus.REJECTED);
        verify(friendRepository, never()).save(Mockito.any());
    }

    private Member member(Long id, String nickname) {
        Member member = Member.create(nickname + "@example.com", "password", nickname);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }

    private FriendRequest friendRequest(Long id, Member requestInviter, Member requestInvitee) {
        FriendRequest friendRequest = FriendRequest.create(requestInviter, requestInvitee);
        ReflectionTestUtils.setField(friendRequest, "id", id);
        return friendRequest;
    }

    private void assertErrorCode(Runnable action, ErrorCode errorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(errorCode);
    }
}
