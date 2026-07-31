package com.wecandoit.bingo.scheduler;

import com.wecandoit.bingo.service.BingoCommandService;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.service.GameCycleCommandService;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BingoBoardRenewalScheduler {

    private final GameRepository gameRepository;
    private final BingoCommandService bingoCommandService;

    @Scheduled(cron = "0 0 * * * *")
    public void notifyRenewalRequiredBoards() {
        List<Game> games = gameRepository.findAllRenewalNotificationTargets(
                GameStatus.ACTIVE,
                RoomStatus.ACTIVE,
                List.of(GameMode.SINGLE, GameMode.COOPERATE),
                LocalDateTime.now().minusDays(GameCycleCommandService.RENEWAL_PERIOD_DAYS)
        );
        for (Game game : games) {
            try {
                bingoCommandService.notifyRenewalRequired(game.getRoomId());
            } catch (Exception e) {
                log.error("빙고판 갱신 필요 알림 실패. roomId={}", game.getRoomId(), e);
            }
        }
    }
}
