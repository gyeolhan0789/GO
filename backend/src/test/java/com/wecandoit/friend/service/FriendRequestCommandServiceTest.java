package com.wecandoit.friend.service;

import com.wecandoit.friend.domain.FriendRequest;
import com.wecandoit.friend.domain.FriendRequestStatus;
import com.wecandoit.friend.repository.FriendRequestRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.friend.domain.Friend;
import com.wecandoit.friend.repository.FriendRepository;
import com.wecandoit.friend.dto.SendFriendRequest;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.notification.domain.NotificationType;
import com.wecandoit.notification.event.NotificationMessageFactory;
import com.wecandoit.notification.event.NotificationRequestedEvent;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("친구 요청 명령 서비스")
class FriendRequestCommandServiceTest {

    @Mock
    private FriendRequestRepository friendRequestRepository;
    @Mock
    private FriendRepository friendRepository;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    private FriendRequestCommandService friendRequestCommandService;

    private Member inviter;
    private Member invitee;

    @BeforeEach
    void setUp() {
        friendRequestCommandService = new FriendRequestCommandService(
                friendRequestRepository,
                friendRepository,
                memberRepository,
                eventPublisher,
                new NotificationMessageFactory()
        );
        inviter = member(1L, "보낸사람");
        invitee = member(2L, "받는사람");
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(inviter));
        given(memberRepository.findByIdForUpdate(2L)).willReturn(Optional.of(invitee));
    }

    @Test
    @DisplayName("친구가 아니고 대기 요청이 없으면 친구 요청을 생성한다")
    void sendRequestCreatesPendingRequest() {
        // given
        given(friendRepository.existsBetween(1L, 2L)).willReturn(false);
        given(friendRequestRepository.findPendingBetween(1L, 2L)).willReturn(Optional.empty());

        // when
        friendRequestCommandService.sendRequest(1L, new SendFriendRequest(2L));

        // then
        ArgumentCaptor<FriendRequest> captor = ArgumentCaptor.forClass(FriendRequest.class);
        then(friendRequestRepository).should().save(captor.capture());
        assertThat(captor.getValue().getInviter()).isEqualTo(inviter);
        assertThat(captor.getValue().getInvitee()).isEqualTo(invitee);
        assertThat(captor.getValue().getStatus()).isEqualTo(FriendRequestStatus.PENDING);
    }

    @Test
    @DisplayName("친구 요청을 생성하면 수신자에게 FRIEND_REQUEST 알림 이벤트가 발행된다")
    void sendRequestPublishesNotificationEvent() {
        // given
        given(friendRepository.existsBetween(1L, 2L)).willReturn(false);
        given(friendRequestRepository.findPendingBetween(1L, 2L)).willReturn(Optional.empty());

        // when
        friendRequestCommandService.sendRequest(1L, new SendFriendRequest(2L));

        // then
        ArgumentCaptor<NotificationRequestedEvent> captor =
                ArgumentCaptor.forClass(NotificationRequestedEvent.class);
        then(eventPublisher).should().publishEvent(captor.capture());
        assertThat(captor.getValue().recipientMemberId()).isEqualTo(2L);
        assertThat(captor.getValue().type()).isEqualTo(NotificationType.FRIEND_REQUEST);
    }

    @Test
    @DisplayName("자기 자신에게 친구 요청을 보내면 실패한다")
    void sendRequestRejectsSelfRequest() {
        // when & then
        assertErrorCode(
                () -> friendRequestCommandService.sendRequest(1L, new SendFriendRequest(1L)),
                ErrorCode.SELF_FRIEND_REQUEST
        );
        then(friendRequestRepository).should(never()).save(Mockito.any());
    }

    @Test
    @DisplayName("이미 친구인 회원에게 친구 요청을 보내면 실패한다")
    void sendRequestRejectsExistingFriend() {
        // given
        given(friendRepository.existsBetween(1L, 2L)).willReturn(true);

        // when & then
        assertErrorCode(
                () -> friendRequestCommandService.sendRequest(1L, new SendFriendRequest(2L)),
                ErrorCode.ALREADY_FRIENDS
        );
        then(friendRequestRepository).should(never()).save(Mockito.any());
    }

    @Test
    @DisplayName("같은 방향의 대기 친구 요청이 있으면 실패한다")
    void sendRequestRejectsDuplicatePendingRequest() {
        // given
        FriendRequest existingRequest = FriendRequest.create(inviter, invitee);
        given(friendRequestRepository.findPendingBetween(1L, 2L)).willReturn(Optional.of(existingRequest));

        // when & then
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
        given(friendRequestRepository.findPendingBetween(1L, 2L)).willReturn(Optional.of(reverseRequest));

        // when & then
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
        given(friendRequestRepository.findByIdForUpdate(10L)).willReturn(Optional.of(friendRequest));
        given(friendRepository.existsBetween(1L, 2L)).willReturn(false);

        // when
        friendRequestCommandService.acceptRequest(2L, 10L);

        // then
        assertThat(friendRequest.getStatus()).isEqualTo(FriendRequestStatus.ACCEPTED);
        then(friendRepository).should().save(Mockito.any(Friend.class));
    }

    @Test
    @DisplayName("친구 요청 수신자가 아니면 수락할 수 없다")
    void acceptRequestRejectsNonInvitee() {
        // given
        FriendRequest friendRequest = friendRequest(10L, inviter, invitee);
        given(friendRequestRepository.findByIdForUpdate(10L)).willReturn(Optional.of(friendRequest));

        // when & then
        assertErrorCode(
                () -> friendRequestCommandService.acceptRequest(1L, 10L),
                ErrorCode.FRIEND_REQUEST_FORBIDDEN
        );
        then(friendRepository).should(never()).save(Mockito.any());
    }

    @Test
    @DisplayName("이미 처리된 친구 요청은 다시 수락할 수 없다")
    void acceptRequestRejectsProcessedRequest() {
        // given
        FriendRequest friendRequest = friendRequest(10L, inviter, invitee);
        friendRequest.reject();
        given(friendRequestRepository.findByIdForUpdate(10L)).willReturn(Optional.of(friendRequest));

        // when & then
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
        given(friendRequestRepository.findByIdForUpdate(10L)).willReturn(Optional.of(friendRequest));

        // when
        friendRequestCommandService.rejectRequest(2L, 10L);

        // then
        assertThat(friendRequest.getStatus()).isEqualTo(FriendRequestStatus.REJECTED);
        then(friendRepository).should(never()).save(Mockito.any());
    }

    @Test
    @DisplayName("발신자가 대기 중인 친구 요청을 취소하면 요청을 삭제한다")
    void cancelRequestDeletesPendingRequest() {
        // given
        FriendRequest friendRequest = friendRequest(10L, inviter, invitee);
        given(friendRequestRepository.findByIdForUpdate(10L)).willReturn(Optional.of(friendRequest));

        // when
        friendRequestCommandService.cancelRequest(1L, 10L);

        // then
        then(friendRequestRepository).should().findByIdForUpdate(10L);
        then(friendRequestRepository).should().delete(friendRequest);
        then(friendRepository).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("요청 발신자가 아니면 친구 요청을 취소할 수 없다")
    void cancelRequestRejectsNonInviter() {
        // given
        FriendRequest friendRequest = friendRequest(10L, inviter, invitee);
        given(friendRequestRepository.findByIdForUpdate(10L)).willReturn(Optional.of(friendRequest));

        // when & then
        assertErrorCode(
                () -> friendRequestCommandService.cancelRequest(2L, 10L),
                ErrorCode.FRIEND_REQUEST_FORBIDDEN
        );
        then(friendRequestRepository).should(never()).delete(Mockito.any());
    }

    @Test
    @DisplayName("존재하지 않거나 이미 삭제된 친구 요청은 취소할 수 없다")
    void cancelRequestRejectsMissingRequest() {
        // given
        given(friendRequestRepository.findByIdForUpdate(10L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(
                () -> friendRequestCommandService.cancelRequest(1L, 10L),
                ErrorCode.FRIEND_REQUEST_NOT_FOUND
        );
    }

    @Test
    @DisplayName("이미 수락된 친구 요청은 취소할 수 없다")
    void cancelRequestRejectsAcceptedRequest() {
        // given
        FriendRequest friendRequest = friendRequest(10L, inviter, invitee);
        friendRequest.accept();
        given(friendRequestRepository.findByIdForUpdate(10L)).willReturn(Optional.of(friendRequest));

        // when & then
        assertErrorCode(
                () -> friendRequestCommandService.cancelRequest(1L, 10L),
                ErrorCode.FRIEND_REQUEST_ALREADY_PROCESSED
        );
        then(friendRequestRepository).should(never()).delete(Mockito.any());
    }

    @Test
    @DisplayName("이미 거절된 친구 요청은 취소할 수 없다")
    void cancelRequestRejectsRejectedRequest() {
        // given
        FriendRequest friendRequest = friendRequest(10L, inviter, invitee);
        friendRequest.reject();
        given(friendRequestRepository.findByIdForUpdate(10L)).willReturn(Optional.of(friendRequest));

        // when & then
        assertErrorCode(
                () -> friendRequestCommandService.cancelRequest(1L, 10L),
                ErrorCode.FRIEND_REQUEST_ALREADY_PROCESSED
        );
        then(friendRequestRepository).should(never()).delete(Mockito.any());
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
