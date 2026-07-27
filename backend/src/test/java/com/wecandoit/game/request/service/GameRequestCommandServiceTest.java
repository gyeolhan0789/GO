package com.wecandoit.game.request.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.status.RequestStatus;
import com.wecandoit.friend.repository.FriendRepository;
import com.wecandoit.game.request.controller.request.GameRequestCreateRequest;
import com.wecandoit.game.request.controller.response.GameRequestCreateResponse;
import com.wecandoit.game.request.domain.GameRequest;
import com.wecandoit.game.request.repository.GameRequestRepository;
import com.wecandoit.game.room.domain.GameMode;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.domain.RoomMember;
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
import com.wecandoit.notification.domain.NotificationType;
import com.wecandoit.notification.event.NotificationMessageFactory;
import com.wecandoit.notification.event.NotificationRequestedEvent;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("게임방 초대 요청 서비스")
class GameRequestCommandServiceTest {

    @Mock
    private GameRequestRepository gameRequestRepository;
    @Mock
    private RoomRepository roomRepository;
    @Mock
    private RoomMemberRepository roomMemberRepository;
    @Mock
    private FriendRepository friendRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    private GameRequestCommandService gameRequestCommandService;

    @BeforeEach
    void setUp() {
        gameRequestCommandService = new GameRequestCommandService(
                gameRequestRepository,
                roomRepository,
                roomMemberRepository,
                friendRepository,
                eventPublisher,
                new NotificationMessageFactory()
        );
    }

    @Test
    @DisplayName("친구를 초대하면 대기 상태의 게임방 초대 요청을 저장한다")
    void createGameRequestSavesPendingRequest() {
        // given
        givenInvitableRoom(GameRoomStatus.CREATED);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(false);
        given(friendRepository.existsBetween(1L, 2L)).willReturn(true);
        given(gameRequestRepository
                .findFirstByRoomIdAndInviteeIdAndStatusOrderByCreatedAtDesc(
                        10L,
                        2L,
                        RequestStatus.PENDING
                ))
                .willReturn(Optional.empty());
        given(gameRequestRepository.save(Mockito.any(GameRequest.class))).willAnswer(invocation -> {
            GameRequest gameRequest = invocation.getArgument(0);
            ReflectionTestUtils.setField(gameRequest, "id", 20L);
            return gameRequest;
        });

        // when
        GameRequestCreateResponse response = gameRequestCommandService.createGameRequest(
                1L,
                10L,
                new GameRequestCreateRequest(2L)
        );

        // then
        ArgumentCaptor<GameRequest> captor = ArgumentCaptor.forClass(GameRequest.class);
        then(gameRequestRepository).should().save(captor.capture());
        GameRequest gameRequest = captor.getValue();
        assertThat(gameRequest.getRoomId()).isEqualTo(10L);
        assertThat(gameRequest.getInviterId()).isEqualTo(1L);
        assertThat(gameRequest.getInviteeId()).isEqualTo(2L);
        assertThat(gameRequest.getStatus()).isEqualTo(RequestStatus.PENDING);
        assertThat(response.requestId()).isEqualTo(20L);
        assertThat(response.status()).isEqualTo(RequestStatus.PENDING);
        assertThat(response.created()).isTrue();
    }

    @Test
    @DisplayName("친구를 초대하면 초대받은 사람에게 FRIEND_INVITE 알림 이벤트가 발행된다")
    void createGameRequestPublishesNotificationEvent() {
        // given
        givenInvitableRoom(GameRoomStatus.CREATED);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(false);
        given(friendRepository.existsBetween(1L, 2L)).willReturn(true);
        given(gameRequestRepository
                .findFirstByRoomIdAndInviteeIdAndStatusOrderByCreatedAtDesc(10L, 2L, RequestStatus.PENDING))
                .willReturn(Optional.empty());
        given(gameRequestRepository.save(Mockito.any(GameRequest.class))).willAnswer(invocation -> {
            GameRequest gameRequest = invocation.getArgument(0);
            ReflectionTestUtils.setField(gameRequest, "id", 20L);
            return gameRequest;
        });

        // when
        gameRequestCommandService.createGameRequest(1L, 10L, new GameRequestCreateRequest(2L));

        // then
        ArgumentCaptor<NotificationRequestedEvent> captor =
                ArgumentCaptor.forClass(NotificationRequestedEvent.class);
        then(eventPublisher).should().publishEvent(captor.capture());
        assertThat(captor.getValue().recipientMemberId()).isEqualTo(2L);
        assertThat(captor.getValue().type()).isEqualTo(NotificationType.FRIEND_INVITE);
    }

    @Test
    @DisplayName("동일한 대기 중 초대 요청이 있으면 기존 요청을 반환한다")
    void createGameRequestReturnsExistingPendingRequest() {
        // given
        givenInvitableRoom(GameRoomStatus.WAITING);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(false);
        given(friendRepository.existsBetween(1L, 2L)).willReturn(true);
        GameRequest existingRequest = gameRequest(20L, 10L, 1L, 2L);
        given(gameRequestRepository
                .findFirstByRoomIdAndInviteeIdAndStatusOrderByCreatedAtDesc(
                        10L,
                        2L,
                        RequestStatus.PENDING
                ))
                .willReturn(Optional.of(existingRequest));

        // when
        GameRequestCreateResponse response = gameRequestCommandService.createGameRequest(
                1L,
                10L,
                new GameRequestCreateRequest(2L)
        );

        // then
        assertThat(response.requestId()).isEqualTo(20L);
        assertThat(response.status()).isEqualTo(RequestStatus.PENDING);
        assertThat(response.created()).isFalse();
        then(gameRequestRepository).should(never()).save(Mockito.any(GameRequest.class));
    }

    @Test
    @DisplayName("존재하지 않는 게임방에 초대를 보내면 실패한다")
    void createGameRequestRejectsMissingRoom() {
        // given
        given(roomRepository.findById(10L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(
                () -> createGameRequest(1L, 2L),
                ErrorCode.ROOM_NOT_FOUND
        );
    }

    @Test
    @DisplayName("게임방 참여자가 아니면 초대를 보낼 수 없다")
    void createGameRequestRejectsNonMemberInviter() {
        // given
        givenInvitableRoom(GameRoomStatus.CREATED);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(false);

        // when & then
        assertErrorCode(
                () -> createGameRequest(1L, 2L),
                ErrorCode.GAME_REQUEST_FORBIDDEN
        );
    }

    @ParameterizedTest
    @EnumSource(value = GameRoomStatus.class, names = {"IN_PROGRESS", "COMPLETED", "CLOSED"})
    @DisplayName("초대할 수 없는 게임방 상태에서는 초대를 거절한다")
    void createGameRequestRejectsUnavailableRoomStatus(GameRoomStatus status) {
        // given
        givenInvitableRoom(status);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);

        // when & then
        assertErrorCode(
                () -> createGameRequest(1L, 2L),
                ErrorCode.GAME_REQUEST_NOT_AVAILABLE
        );
    }

    @Test
    @DisplayName("자기 자신을 게임방에 초대하면 실패한다")
    void createGameRequestRejectsSelfInvite() {
        // given
        givenInvitableRoom(GameRoomStatus.READY);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);

        // when & then
        assertErrorCode(
                () -> createGameRequest(1L, 1L),
                ErrorCode.GAME_REQUEST_SELF_INVITE
        );
    }

    @Test
    @DisplayName("이미 게임방에 참여 중인 친구를 초대하면 실패한다")
    void createGameRequestRejectsExistingRoomMember() {
        // given
        givenInvitableRoom(GameRoomStatus.READY);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(true);

        // when & then
        assertErrorCode(
                () -> createGameRequest(1L, 2L),
                ErrorCode.GAME_REQUEST_ALREADY_ROOM_MEMBER
        );
    }

    @Test
    @DisplayName("친구가 아닌 회원을 게임방에 초대하면 실패한다")
    void createGameRequestRejectsNonFriend() {
        // given
        givenInvitableRoom(GameRoomStatus.READY);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(false);
        given(friendRepository.existsBetween(1L, 2L)).willReturn(false);

        // when & then
        assertErrorCode(
                () -> createGameRequest(1L, 2L),
                ErrorCode.GAME_REQUEST_FRIEND_REQUIRED
        );
    }

    @Test
    @DisplayName("최대 인원에 도달한 게임방에는 초대를 보낼 수 없다")
    void createGameRequestRejectsFullRoom() {
        // given
        givenInvitableRoom(GameRoomStatus.READY);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.countByRoomId(10L)).willReturn(4L);

        // when & then
        assertErrorCode(
                () -> createGameRequest(1L, 2L),
                ErrorCode.ROOM_MAXIMUM_PARTICIPANTS_REACHED
        );
        then(gameRequestRepository).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("게임방 초대 요청을 수락하면 요청 상태를 변경하고 방 참여자를 저장한다")
    void acceptGameRequestSavesRoomMember() {
        // given
        GameRequest gameRequest = gameRequest(20L, 10L, 1L, 2L);
        Room room = givenAcceptableRoom(GameRoomStatus.WAITING);
        given(gameRequestRepository.findById(20L)).willReturn(Optional.of(gameRequest));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(false);
        given(roomMemberRepository.countByRoomId(10L)).willReturn(1L);

        // when
        gameRequestCommandService.acceptGameRequest(2L, 10L, 20L);

        // then
        ArgumentCaptor<RoomMember> captor = ArgumentCaptor.forClass(RoomMember.class);
        then(roomMemberRepository).should().save(captor.capture());
        RoomMember roomMember = captor.getValue();
        assertThat(gameRequest.getStatus()).isEqualTo(RequestStatus.ACCEPTED);
        assertThat(roomMember.getRoomId()).isEqualTo(10L);
        assertThat(roomMember.getMemberId()).isEqualTo(2L);
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.READY);
    }

    @Test
    @DisplayName("게임방 초대 요청을 거절하면 요청 상태를 변경한다")
    void rejectGameRequestUpdatesStatus() {
        // given
        GameRequest gameRequest = gameRequest(20L, 10L, 1L, 2L);
        given(gameRequestRepository.findById(20L)).willReturn(Optional.of(gameRequest));

        // when
        gameRequestCommandService.rejectGameRequest(2L, 10L, 20L);

        // then
        assertThat(gameRequest.getStatus()).isEqualTo(RequestStatus.DECLINED);
        then(roomMemberRepository).should(never()).save(Mockito.any(RoomMember.class));
    }

    @Test
    @DisplayName("보낸 게임방 초대 요청을 취소하면 요청 상태를 변경한다")
    void cancelGameRequestUpdatesStatus() {
        // given
        GameRequest gameRequest = gameRequest(20L, 10L, 1L, 2L);
        given(roomRepository.existsById(10L)).willReturn(true);
        given(gameRequestRepository.findById(20L)).willReturn(Optional.of(gameRequest));

        // when
        gameRequestCommandService.cancelGameRequest(1L, 10L, 20L);

        // then
        assertThat(gameRequest.getStatus()).isEqualTo(RequestStatus.CANCELED);
        then(roomMemberRepository).should(never()).save(Mockito.any(RoomMember.class));
    }

    @Test
    @DisplayName("존재하지 않는 게임방의 초대 요청을 취소하면 실패한다")
    void cancelGameRequestRejectsMissingRoom() {
        // given
        given(roomRepository.existsById(10L)).willReturn(false);

        // when & then
        assertErrorCode(
                () -> gameRequestCommandService.cancelGameRequest(1L, 10L, 20L),
                ErrorCode.ROOM_NOT_FOUND
        );
        then(gameRequestRepository).should(never()).findById(20L);
    }

    @Test
    @DisplayName("존재하지 않는 게임방 초대 요청을 취소하면 실패한다")
    void cancelGameRequestRejectsMissingRequest() {
        // given
        given(roomRepository.existsById(10L)).willReturn(true);
        given(gameRequestRepository.findById(20L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(
                () -> gameRequestCommandService.cancelGameRequest(1L, 10L, 20L),
                ErrorCode.GAME_REQUEST_NOT_FOUND
        );
    }

    @Test
    @DisplayName("요청의 게임방과 경로의 게임방이 다르면 초대 취소에 실패한다")
    void cancelGameRequestRejectsDifferentRoom() {
        // given
        GameRequest gameRequest = gameRequest(20L, 11L, 1L, 2L);
        given(roomRepository.existsById(10L)).willReturn(true);
        given(gameRequestRepository.findById(20L)).willReturn(Optional.of(gameRequest));

        // when & then
        assertErrorCode(
                () -> gameRequestCommandService.cancelGameRequest(1L, 10L, 20L),
                ErrorCode.GAME_REQUEST_NOT_FOUND
        );
    }

    @Test
    @DisplayName("초대한 회원이 아니면 게임방 초대 요청을 취소할 수 없다")
    void cancelGameRequestRejectsForbiddenMember() {
        // given
        GameRequest gameRequest = gameRequest(20L, 10L, 1L, 2L);
        given(roomRepository.existsById(10L)).willReturn(true);
        given(gameRequestRepository.findById(20L)).willReturn(Optional.of(gameRequest));

        // when & then
        assertErrorCode(
                () -> gameRequestCommandService.cancelGameRequest(3L, 10L, 20L),
                ErrorCode.GAME_REQUEST_FORBIDDEN
        );
    }

    @ParameterizedTest
    @EnumSource(value = RequestStatus.class, names = {"ACCEPTED", "DECLINED", "CANCELED"})
    @DisplayName("이미 처리된 게임방 초대 요청은 취소할 수 없다")
    void cancelGameRequestRejectsAlreadyProcessedRequest(RequestStatus status) {
        // given
        GameRequest gameRequest = gameRequest(20L, 10L, 1L, 2L);
        updateStatus(gameRequest, status);
        given(roomRepository.existsById(10L)).willReturn(true);
        given(gameRequestRepository.findById(20L)).willReturn(Optional.of(gameRequest));

        // when & then
        assertErrorCode(
                () -> gameRequestCommandService.cancelGameRequest(1L, 10L, 20L),
                ErrorCode.GAME_REQUEST_ALREADY_PROCESSED
        );
    }

    @Test
    @DisplayName("존재하지 않는 게임방 초대 요청을 처리하면 실패한다")
    void processGameRequestRejectsMissingRequest() {
        // given
        given(gameRequestRepository.findById(20L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(
                () -> gameRequestCommandService.acceptGameRequest(2L, 10L, 20L),
                ErrorCode.GAME_REQUEST_NOT_FOUND
        );
    }

    @Test
    @DisplayName("요청의 게임방과 경로의 게임방이 다르면 실패한다")
    void processGameRequestRejectsDifferentRoom() {
        // given
        GameRequest gameRequest = gameRequest(20L, 11L, 1L, 2L);
        given(gameRequestRepository.findById(20L)).willReturn(Optional.of(gameRequest));

        // when & then
        assertErrorCode(
                () -> gameRequestCommandService.acceptGameRequest(2L, 10L, 20L),
                ErrorCode.GAME_REQUEST_NOT_FOUND
        );
    }

    @Test
    @DisplayName("초대받은 회원이 아니면 게임방 초대 요청을 처리할 수 없다")
    void processGameRequestRejectsForbiddenMember() {
        // given
        GameRequest gameRequest = gameRequest(20L, 10L, 1L, 2L);
        given(gameRequestRepository.findById(20L)).willReturn(Optional.of(gameRequest));

        // when & then
        assertErrorCode(
                () -> gameRequestCommandService.acceptGameRequest(3L, 10L, 20L),
                ErrorCode.GAME_REQUEST_FORBIDDEN
        );
    }

    @Test
    @DisplayName("이미 처리된 게임방 초대 요청은 다시 처리할 수 없다")
    void processGameRequestRejectsAlreadyProcessedRequest() {
        // given
        GameRequest gameRequest = gameRequest(20L, 10L, 1L, 2L);
        gameRequest.accept();
        given(gameRequestRepository.findById(20L)).willReturn(Optional.of(gameRequest));

        // when & then
        assertErrorCode(
                () -> gameRequestCommandService.rejectGameRequest(2L, 10L, 20L),
                ErrorCode.GAME_REQUEST_ALREADY_PROCESSED
        );
    }

    @Test
    @DisplayName("이미 게임방에 참여 중이면 게임방 초대 요청을 수락할 수 없다")
    void acceptGameRequestRejectsExistingRoomMember() {
        // given
        GameRequest gameRequest = gameRequest(20L, 10L, 1L, 2L);
        given(gameRequestRepository.findById(20L)).willReturn(Optional.of(gameRequest));
        givenAcceptableRoom(GameRoomStatus.READY);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(true);

        // when & then
        assertErrorCode(
                () -> gameRequestCommandService.acceptGameRequest(2L, 10L, 20L),
                ErrorCode.GAME_REQUEST_ALREADY_ROOM_MEMBER
        );
        assertThat(gameRequest.getStatus()).isEqualTo(RequestStatus.PENDING);
        then(roomMemberRepository).should(never()).save(Mockito.any(RoomMember.class));
    }

    @Test
    @DisplayName("게임이 시작된 방의 초대 요청은 수락할 수 없다")
    void acceptGameRequestRejectsInProgressRoom() {
        // given
        GameRequest gameRequest = gameRequest(20L, 10L, 1L, 2L);
        given(gameRequestRepository.findById(20L)).willReturn(Optional.of(gameRequest));
        givenAcceptableRoom(GameRoomStatus.IN_PROGRESS);

        // when & then
        assertErrorCode(
                () -> gameRequestCommandService.acceptGameRequest(2L, 10L, 20L),
                ErrorCode.GAME_REQUEST_NOT_AVAILABLE
        );
        assertThat(gameRequest.getStatus()).isEqualTo(RequestStatus.PENDING);
        then(roomMemberRepository).should(never()).save(Mockito.any(RoomMember.class));
    }

    @Test
    @DisplayName("수락 시점에 최대 인원에 도달한 게임방에는 참여할 수 없다")
    void acceptGameRequestRejectsFullRoom() {
        // given
        GameRequest gameRequest = gameRequest(20L, 10L, 1L, 2L);
        given(gameRequestRepository.findById(20L)).willReturn(Optional.of(gameRequest));
        givenAcceptableRoom(GameRoomStatus.READY);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(false);
        given(roomMemberRepository.countByRoomId(10L)).willReturn(4L);

        // when & then
        assertErrorCode(
                () -> gameRequestCommandService.acceptGameRequest(2L, 10L, 20L),
                ErrorCode.ROOM_MAXIMUM_PARTICIPANTS_REACHED
        );
        assertThat(gameRequest.getStatus()).isEqualTo(RequestStatus.PENDING);
        then(roomMemberRepository).should(never()).save(Mockito.any(RoomMember.class));
    }

    private void givenInvitableRoom(GameRoomStatus status) {
        Room room = Room.create(1L, GameMode.COOPERATE, 3, 3, 10000);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", status);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
    }

    private Room givenAcceptableRoom(GameRoomStatus status) {
        Room room = Room.create(1L, GameMode.COOPERATE, 3, 3, 10000);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", status);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        return room;
    }

    private GameRequest gameRequest(Long id, Long roomId, Long inviterId, Long inviteeId) {
        GameRequest gameRequest = GameRequest.create(roomId, inviterId, inviteeId);
        ReflectionTestUtils.setField(gameRequest, "id", id);
        return gameRequest;
    }

    private void updateStatus(GameRequest gameRequest, RequestStatus status) {
        if (status == RequestStatus.ACCEPTED) {
            gameRequest.accept();
        } else if (status == RequestStatus.DECLINED) {
            gameRequest.reject();
        } else if (status == RequestStatus.CANCELED) {
            gameRequest.cancel();
        }
    }

    private void createGameRequest(Long memberId, Long inviteeId) {
        gameRequestCommandService.createGameRequest(
                memberId,
                10L,
                new GameRequestCreateRequest(inviteeId)
        );
    }

    private void assertErrorCode(Runnable action, ErrorCode errorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(errorCode);
    }
}
