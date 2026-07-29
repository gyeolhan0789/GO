package com.wecandoit.game.room.scheduler;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.scheduler.SingleSessionExpirationScheduler;
import com.wecandoit.game.service.RoomCommandService;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("싱글 세션 만료 스케줄러")
@ExtendWith(MockitoExtension.class)
class SingleSessionExpirationSchedulerTest {

    @Mock
    private RoomRepository roomRepository;
    @Mock
    private RoomCommandService roomCommandService;
    @InjectMocks
    private SingleSessionExpirationScheduler scheduler;

    @Test
    @DisplayName("진행 중인 싱글 세션마다 7일 전 만료 기준으로 종료를 시도한다")
    void expireSingleSessionsExpiresEveryInProgressSingleRoom() {
        // given
        given(roomRepository.findAllByModeAndStatus(GameMode.SINGLE, GameRoomStatus.IN_PROGRESS))
                .willReturn(List.of(room(1L), room(2L)));

        // when
        scheduler.expireSingleSessions();

        // then
        ArgumentCaptor<LocalDateTime> expirationTimeCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        then(roomCommandService).should().expireSingleRoom(org.mockito.ArgumentMatchers.eq(1L),
                expirationTimeCaptor.capture());
        then(roomCommandService).should().expireSingleRoom(org.mockito.ArgumentMatchers.eq(2L),
                org.mockito.ArgumentMatchers.eq(expirationTimeCaptor.getValue()));
    }

    private Room room(Long roomId) {
        Room room = Room.create(1L, "테스트 방", GameMode.SINGLE, null, 3);
        ReflectionTestUtils.setField(room, "id", roomId);
        return room;
    }
}
