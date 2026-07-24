package com.wecandoit.game.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.room.controller.request.CreateRoomRequest;
import com.wecandoit.game.room.controller.response.CreateRoomResponse;
import com.wecandoit.game.room.domain.GameMode;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.domain.RoomMember;
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("게임방 서비스")
class RoomCommandServiceTest {

    private static final int DEFAULT_BOARD_SIZE = 3;

    @Mock
    private RoomRepository roomRepository;
    @Mock
    private RoomMemberRepository roomMemberRepository;
    private RoomCommandService roomCommandService;

    @BeforeEach
    void setUp() {
        roomCommandService = new RoomCommandService(
                roomRepository,
                roomMemberRepository
        );
    }

    @Test
    @DisplayName("게임방을 생성하면 방과 방장 참여 정보를 저장한다")
    void createRoomSavesRoomAndHostMember() {
        // given
        given(roomRepository.save(Mockito.any(Room.class))).willAnswer(invocation -> {
            Room room = invocation.getArgument(0);
            ReflectionTestUtils.setField(room, "id", 10L);
            return room;
        });

        // when
        CreateRoomResponse response = roomCommandService.createRoom(
                1L,
                new CreateRoomRequest(GameMode.COOPERATE, 3, 3)
        );

        // then
        ArgumentCaptor<Room> roomCaptor = ArgumentCaptor.forClass(Room.class);
        ArgumentCaptor<RoomMember> roomMemberCaptor = ArgumentCaptor.forClass(RoomMember.class);
        then(roomRepository).should().save(roomCaptor.capture());
        then(roomMemberRepository).should().save(roomMemberCaptor.capture());

        Room room = roomCaptor.getValue();
        assertThat(room.getHostId()).isEqualTo(1L);
        assertThat(room.getMode()).isEqualTo(GameMode.COOPERATE);
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.CREATED);
        assertThat(room.getTargetBingoCount()).isEqualTo(3);
        assertThat(room.getBoardSize()).isEqualTo(3);

        RoomMember roomMember = roomMemberCaptor.getValue();
        assertThat(roomMember.getRoomId()).isEqualTo(10L);
        assertThat(roomMember.getMemberId()).isEqualTo(1L);
        assertThat(roomMember.getCompletedMissionCount()).isZero();
        assertThat(roomMember.getJoinedAt()).isNotNull();

        assertThat(response.roomId()).isEqualTo(10L);
        assertThat(response.status()).isEqualTo(GameRoomStatus.CREATED);
    }

    @Test
    @DisplayName("방장이 게임방을 삭제하면 게임방 상태를 종료로 변경한다")
    void deleteRoomClosesRoom() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, 3, 3);
        ReflectionTestUtils.setField(room, "id", 10L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));

        // when
        roomCommandService.deleteRoom(1L, 10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.CLOSED);
        then(roomMemberRepository).should().deleteAllByRoomId(10L);
    }

    @Test
    @DisplayName("존재하지 않는 게임방을 삭제하면 실패한다")
    void deleteRoomRejectsMissingRoom() {
        // given
        given(roomRepository.findById(10L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(
                () -> roomCommandService.deleteRoom(1L, 10L),
                ErrorCode.ROOM_NOT_FOUND
        );
    }

    @Test
    @DisplayName("방장이 아닌 회원이 게임방을 삭제하면 실패한다")
    void deleteRoomRejectsNonHost() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, 3, 3);
        ReflectionTestUtils.setField(room, "id", 10L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));

        // when & then
        assertErrorCode(
                () -> roomCommandService.deleteRoom(2L, 10L),
                ErrorCode.ROOM_DELETE_FORBIDDEN
        );
    }

    @Test
    @DisplayName("일반 참여자가 게임방을 나가면 본인 참여 정보만 삭제한다")
    void leaveRoomDeletesMemberOnly() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, 3, DEFAULT_BOARD_SIZE);
        RoomMember roomMember = RoomMember.create(10L, 2L);
        ReflectionTestUtils.setField(room, "id", 10L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.findByRoomIdAndMemberId(10L, 2L)).willReturn(Optional.of(roomMember));

        // when
        roomCommandService.leaveRoom(2L, 10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.CREATED);
        then(roomMemberRepository).should().delete(roomMember);
        then(roomMemberRepository).should(Mockito.never()).deleteAllByRoomId(10L);
    }

    @Test
    @DisplayName("방장이 게임방을 나가면 게임방을 종료하고 참여자 정보를 모두 삭제한다")
    void leaveRoomByHostClosesRoomAndDeletesMembers() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, 3, DEFAULT_BOARD_SIZE);
        RoomMember roomMember = RoomMember.create(10L, 1L);
        ReflectionTestUtils.setField(room, "id", 10L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.findByRoomIdAndMemberId(10L, 1L)).willReturn(Optional.of(roomMember));

        // when
        roomCommandService.leaveRoom(1L, 10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.CLOSED);
        then(roomMemberRepository).should().deleteAllByRoomId(10L);
        then(roomMemberRepository).should(Mockito.never()).delete(Mockito.any(RoomMember.class));
    }

    @Test
    @DisplayName("존재하지 않는 게임방을 나가면 실패한다")
    void leaveRoomRejectsMissingRoom() {
        // given
        given(roomRepository.findById(10L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(
                () -> roomCommandService.leaveRoom(1L, 10L),
                ErrorCode.ROOM_NOT_FOUND
        );
    }

    @Test
    @DisplayName("종료된 게임방을 나가면 실패한다")
    void leaveRoomRejectsClosedRoom() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, 3, DEFAULT_BOARD_SIZE);
        room.close();
        ReflectionTestUtils.setField(room, "id", 10L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));

        // when & then
        assertErrorCode(
                () -> roomCommandService.leaveRoom(1L, 10L),
                ErrorCode.ROOM_CLOSED
        );
    }

    @Test
    @DisplayName("게임방 참여자가 아니면 나가기에 실패한다")
    void leaveRoomRejectsNonMember() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, 3, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.findByRoomIdAndMemberId(10L, 2L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(
                () -> roomCommandService.leaveRoom(2L, 10L),
                ErrorCode.ROOM_MEMBER_FORBIDDEN
        );
    }

    @Test
    @DisplayName("방장이 READY 상태의 게임방에서 게임을 시작하면 IN_PROGRESS로 전이하고 시작 시각을 기록한다")
    void startGameTransitionsReadyRoomToInProgress() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, 3, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.READY);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));

        // when
        roomCommandService.startGame(1L, 10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.IN_PROGRESS);
        assertThat(room.getStartedAt()).isNotNull();
    }

    @Test
    @DisplayName("존재하지 않는 게임방에서 게임을 시작하면 실패한다")
    void startGameRejectsMissingRoom() {
        // given
        given(roomRepository.findById(10L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(
                () -> roomCommandService.startGame(1L, 10L),
                ErrorCode.ROOM_NOT_FOUND
        );
    }

    @Test
    @DisplayName("방장이 아닌 회원이 게임을 시작하면 실패한다")
    void startGameRejectsNonHost() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, 3, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.READY);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));

        // when & then
        assertErrorCode(
                () -> roomCommandService.startGame(2L, 10L),
                ErrorCode.ROOM_START_FORBIDDEN
        );
    }

    @Test
    @DisplayName("READY 상태가 아닌 게임방에서 게임을 시작하면 실패한다")
    void startGameRejectsRoomNotReady() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, 3, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));

        // when & then
        assertErrorCode(
                () -> roomCommandService.startGame(1L, 10L),
                ErrorCode.ROOM_NOT_READY
        );
    }

    private void assertErrorCode(Runnable action, ErrorCode errorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(errorCode);
    }
}
