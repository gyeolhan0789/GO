package com.wecandoit.game.request.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("게임방 초대 요청 서비스")
class GameRequestServiceTest {

    private final GameRequestRepository gameRequestRepository = Mockito.mock(GameRequestRepository.class);
    private final RoomRepository roomRepository = Mockito.mock(RoomRepository.class);
    private final RoomMemberRepository roomMemberRepository = Mockito.mock(RoomMemberRepository.class);
    private final FriendRepository friendRepository = Mockito.mock(FriendRepository.class);
    private final GameRequestService gameRequestService = new GameRequestService(
            gameRequestRepository,
            roomRepository,
            roomMemberRepository,
            friendRepository
    );

    @Test
    @DisplayName("친구를 초대하면 대기 상태의 게임방 초대 요청을 저장한다")
    void createGameRequestSavesPendingRequest() {
        // given
        givenInvitableRoom(GameRoomStatus.CREATED);
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).thenReturn(true);
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).thenReturn(false);
        when(friendRepository.existsBetween(1L, 2L)).thenReturn(true);
        when(gameRequestRepository
                .findFirstByRoomIdAndInviteeIdAndStatusOrderByCreatedAtDesc(
                        10L,
                        2L,
                        RequestStatus.PENDING
                ))
                .thenReturn(Optional.empty());
        when(gameRequestRepository.save(Mockito.any(GameRequest.class))).thenAnswer(invocation -> {
            GameRequest gameRequest = invocation.getArgument(0);
            ReflectionTestUtils.setField(gameRequest, "id", 20L);
            return gameRequest;
        });

        // when
        GameRequestCreateResponse response = gameRequestService.createGameRequest(
                1L,
                10L,
                new GameRequestCreateRequest(2L)
        );

        // then
        ArgumentCaptor<GameRequest> captor = ArgumentCaptor.forClass(GameRequest.class);
        verify(gameRequestRepository).save(captor.capture());
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
    @DisplayName("동일한 대기 중 초대 요청이 있으면 기존 요청을 반환한다")
    void createGameRequestReturnsExistingPendingRequest() {
        // given
        givenInvitableRoom(GameRoomStatus.WAITING);
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).thenReturn(true);
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).thenReturn(false);
        when(friendRepository.existsBetween(1L, 2L)).thenReturn(true);
        GameRequest existingRequest = gameRequest(20L, 10L, 1L, 2L);
        when(gameRequestRepository
                .findFirstByRoomIdAndInviteeIdAndStatusOrderByCreatedAtDesc(
                        10L,
                        2L,
                        RequestStatus.PENDING
                ))
                .thenReturn(Optional.of(existingRequest));

        // when
        GameRequestCreateResponse response = gameRequestService.createGameRequest(
                1L,
                10L,
                new GameRequestCreateRequest(2L)
        );

        // then
        assertThat(response.requestId()).isEqualTo(20L);
        assertThat(response.status()).isEqualTo(RequestStatus.PENDING);
        assertThat(response.created()).isFalse();
        verify(gameRequestRepository, never()).save(Mockito.any(GameRequest.class));
    }

    @Test
    @DisplayName("존재하지 않는 게임방에 초대를 보내면 실패한다")
    void createGameRequestRejectsMissingRoom() {
        // given
        when(roomRepository.findById(10L)).thenReturn(Optional.empty());

        // when, then
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
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).thenReturn(false);

        // when, then
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
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).thenReturn(true);

        // when, then
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
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).thenReturn(true);

        // when, then
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
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).thenReturn(true);
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).thenReturn(true);

        // when, then
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
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).thenReturn(true);
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).thenReturn(false);
        when(friendRepository.existsBetween(1L, 2L)).thenReturn(false);

        // when, then
        assertErrorCode(
                () -> createGameRequest(1L, 2L),
                ErrorCode.GAME_REQUEST_FRIEND_REQUIRED
        );
    }

    private void givenInvitableRoom(GameRoomStatus status) {
        Room room = Room.create(1L, GameMode.COOPERATE, 3);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", status);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
    }

    private GameRequest gameRequest(Long id, Long roomId, Long inviterId, Long inviteeId) {
        GameRequest gameRequest = GameRequest.create(roomId, inviterId, inviteeId);
        ReflectionTestUtils.setField(gameRequest, "id", id);
        return gameRequest;
    }

    private void createGameRequest(Long memberId, Long inviteeId) {
        gameRequestService.createGameRequest(
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
