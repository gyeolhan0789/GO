package com.wecandoit.bingo.scheduler;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.bingo.service.BingoCommandService;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.repository.GameRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("빙고판 갱신 알림 스케줄러")
class BingoBoardRenewalSchedulerTest {

    @Mock
    private GameRepository gameRepository;
    @Mock
    private BingoCommandService bingoCommandService;
    @InjectMocks
    private BingoBoardRenewalScheduler scheduler;

    @Test
    @DisplayName("만료된 활성 공유 게임만 조회해 갱신 알림을 요청한다")
    void notifyRenewalRequiredBoardsUsesEligibleGames() {
        Game game = Game.start(10L);
        ReflectionTestUtils.setField(game, "id", 20L);
        given(gameRepository.findAllRenewalNotificationTargets(
                eq(GameStatus.ACTIVE),
                eq(RoomStatus.ACTIVE),
                eq(List.of(GameMode.SINGLE, GameMode.COOPERATE)),
                any()
        )).willReturn(List.of(game));

        scheduler.notifyRenewalRequiredBoards();

        then(bingoCommandService).should().notifyRenewalRequired(10L);
    }
}
