package com.wecandoit.game.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("게임방 서비스")
class RoomCommandServiceTest {

    private final RoomRepository roomRepository = Mockito.mock(RoomRepository.class);
    private final RoomMemberRepository roomMemberRepository = Mockito.mock(RoomMemberRepository.class);
    private final RoomCommandService roomCommandService = new RoomCommandService(
            roomRepository,
            roomMemberRepository
    );

    @Test
    @DisplayName("게임방을 생성하면 방과 방장 참여 정보를 저장한다")
    void createRoomSavesRoomAndHostMember() {
        // given
        when(roomRepository.save(Mockito.any(Room.class))).thenAnswer(invocation -> {
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
        verify(roomRepository).save(roomCaptor.capture());
        verify(roomMemberRepository).save(roomMemberCaptor.capture());

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
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));

        // when
        roomCommandService.deleteRoom(1L, 10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.CLOSED);
    }

    @Test
    @DisplayName("존재하지 않는 게임방을 삭제하면 실패한다")
    void deleteRoomRejectsMissingRoom() {
        // given
        when(roomRepository.findById(10L)).thenReturn(Optional.empty());

        // when, then
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
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));

        // when, then
        assertErrorCode(
                () -> roomCommandService.deleteRoom(2L, 10L),
                ErrorCode.ROOM_DELETE_FORBIDDEN
        );
    }

    private void assertErrorCode(Runnable action, ErrorCode errorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(errorCode);
    }
}
