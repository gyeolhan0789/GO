package com.wecandoit.bingo.scheduler;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.times;

import com.wecandoit.bingo.service.BingoCommandService;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.repository.RoomRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("빙고판 갱신 필요 알림 스케줄러")
@ExtendWith(MockitoExtension.class)
class BingoBoardRenewalSchedulerTest {

    @Mock
    private RoomRepository roomRepository;
    @Mock
    private BingoCommandService bingoCommandService;
    @InjectMocks
    private BingoBoardRenewalScheduler scheduler;

    @Test
    @DisplayName("진행 중인 모든 방에 대해 갱신 필요 알림을 검사한다")
    void notifyRenewalRequiredBoardsChecksEveryInProgressRoom() {
        // given
        Room room1 = inProgressRoom(1L);
        Room room2 = inProgressRoom(2L);
        Room room3 = inProgressRoom(3L);
        given(roomRepository.findAllByStatus(GameRoomStatus.IN_PROGRESS))
                .willReturn(List.of(room1, room2, room3));

        // when
        scheduler.notifyRenewalRequiredBoards();

        // then
        then(bingoCommandService).should(times(1)).notifyRenewalRequired(1L);
        then(bingoCommandService).should(times(1)).notifyRenewalRequired(2L);
        then(bingoCommandService).should(times(1)).notifyRenewalRequired(3L);
    }

    @Test
    @DisplayName("특정 방의 알림 검사가 실패해도 나머지 방은 계속 처리된다")
    void notifyRenewalRequiredBoardsContinuesAfterFailure() {
        // given
        Room room1 = inProgressRoom(1L);
        Room room2 = inProgressRoom(2L);
        Room room3 = inProgressRoom(3L);
        given(roomRepository.findAllByStatus(GameRoomStatus.IN_PROGRESS))
                .willReturn(List.of(room1, room2, room3));
        willThrow(new RuntimeException("알림 실패")).given(bingoCommandService).notifyRenewalRequired(2L);

        // when
        scheduler.notifyRenewalRequiredBoards();

        // then
        then(bingoCommandService).should(times(1)).notifyRenewalRequired(1L);
        then(bingoCommandService).should(times(1)).notifyRenewalRequired(2L);
        then(bingoCommandService).should(times(1)).notifyRenewalRequired(3L);
    }

    @Test
    @DisplayName("진행 중인 방이 없으면 알림 검사를 호출하지 않는다")
    void notifyRenewalRequiredBoardsDoesNothingWhenNoRoomsInProgress() {
        // given
        given(roomRepository.findAllByStatus(GameRoomStatus.IN_PROGRESS)).willReturn(List.of());

        // when
        scheduler.notifyRenewalRequiredBoards();

        // then
        then(bingoCommandService).should(Mockito.never()).notifyRenewalRequired(Mockito.anyLong());
    }

    private Room inProgressRoom(Long roomId) {
        Room room = Room.create(1L, "테스트 방", GameMode.SINGLE, null, 10_000, 3);
        ReflectionTestUtils.setField(room, "id", roomId);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        return room;
    }
}
