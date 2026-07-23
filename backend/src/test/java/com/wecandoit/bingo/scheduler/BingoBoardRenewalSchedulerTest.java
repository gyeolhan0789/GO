package com.wecandoit.bingo.scheduler;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.wecandoit.bingo.service.BingoService;
import com.wecandoit.game.room.domain.GameMode;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.repository.RoomRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("빙고판 자동 갱신 스케줄러")
class BingoBoardRenewalSchedulerTest {

    private final RoomRepository roomRepository = Mockito.mock(RoomRepository.class);
    private final BingoService bingoService = Mockito.mock(BingoService.class);
    private final BingoBoardRenewalScheduler scheduler =
            new BingoBoardRenewalScheduler(roomRepository, bingoService);

    @Test
    @DisplayName("진행 중인 모든 방에 대해 자동 갱신을 한 번씩 호출한다")
    void renewExpiredBoardsCallsAutoRenewForEveryRoom() {
        // given
        Room room1 = inProgressRoom(1L);
        Room room2 = inProgressRoom(2L);
        Room room3 = inProgressRoom(3L);
        when(roomRepository.findAllByStatus(GameRoomStatus.IN_PROGRESS))
                .thenReturn(List.of(room1, room2, room3));

        // when
        scheduler.renewExpiredBoards();

        // then
        verify(bingoService, times(1)).autoRenewBoard(1L);
        verify(bingoService, times(1)).autoRenewBoard(2L);
        verify(bingoService, times(1)).autoRenewBoard(3L);
    }

    @Test
    @DisplayName("특정 방의 자동 갱신이 실패해도 나머지 방은 계속 처리된다")
    void renewExpiredBoardsContinuesAfterFailure() {
        // given
        Room room1 = inProgressRoom(1L);
        Room room2 = inProgressRoom(2L);
        Room room3 = inProgressRoom(3L);
        when(roomRepository.findAllByStatus(GameRoomStatus.IN_PROGRESS))
                .thenReturn(List.of(room1, room2, room3));
        doThrow(new RuntimeException("갱신 실패")).when(bingoService).autoRenewBoard(2L);

        // when
        scheduler.renewExpiredBoards();

        // then
        verify(bingoService, times(1)).autoRenewBoard(1L);
        verify(bingoService, times(1)).autoRenewBoard(2L);
        verify(bingoService, times(1)).autoRenewBoard(3L);
    }

    @Test
    @DisplayName("진행 중인 방이 없으면 자동 갱신을 호출하지 않는다")
    void renewExpiredBoardsDoesNothingWhenNoRoomsInProgress() {
        // given
        when(roomRepository.findAllByStatus(GameRoomStatus.IN_PROGRESS)).thenReturn(List.of());

        // when
        scheduler.renewExpiredBoards();

        // then
        verify(bingoService, Mockito.never()).autoRenewBoard(Mockito.anyLong());
    }

    private Room inProgressRoom(Long roomId) {
        Room room = Room.create(1L, GameMode.SINGLE, 3, 3);
        ReflectionTestUtils.setField(room, "id", roomId);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        return room;
    }
}
