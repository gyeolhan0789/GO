package com.wecandoit.game.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.wecandoit.game.room.controller.request.CreateRoomRequest;
import com.wecandoit.game.room.controller.response.CreateRoomResponse;
import com.wecandoit.game.room.domain.GameMode;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.domain.RoomMember;
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("게임방 서비스")
class RoomServiceTest {

    private final RoomRepository roomRepository = Mockito.mock(RoomRepository.class);
    private final RoomMemberRepository roomMemberRepository = Mockito.mock(RoomMemberRepository.class);
    private final RoomService roomService = new RoomService(roomRepository, roomMemberRepository);

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
        CreateRoomResponse response = roomService.createRoom(
                1L,
                new CreateRoomRequest(GameMode.COOPERATE, 3)
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

        RoomMember roomMember = roomMemberCaptor.getValue();
        assertThat(roomMember.getRoomId()).isEqualTo(10L);
        assertThat(roomMember.getMemberId()).isEqualTo(1L);
        assertThat(roomMember.getCompletedMissionCount()).isZero();
        assertThat(roomMember.getJoinedAt()).isNotNull();

        assertThat(response.roomId()).isEqualTo(10L);
        assertThat(response.status()).isEqualTo(GameRoomStatus.CREATED);
    }
}
