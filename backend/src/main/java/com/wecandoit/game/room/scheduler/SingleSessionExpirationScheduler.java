package com.wecandoit.game.room.scheduler;

import com.wecandoit.game.room.domain.GameMode;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.repository.RoomRepository;
import com.wecandoit.game.room.service.RoomCommandService;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SingleSessionExpirationScheduler {

    private static final long SESSION_DURATION_DAYS = 7;

    private final RoomRepository roomRepository;
    private final RoomCommandService roomCommandService;

    @Scheduled(cron = "0 0 * * * *")
    public void expireSingleSessions() {
        LocalDateTime expirationTime = LocalDateTime.now().minusDays(SESSION_DURATION_DAYS);
        roomRepository.findAllByModeAndStatus(GameMode.SINGLE, GameRoomStatus.IN_PROGRESS)
                .forEach(room -> expireSingleRoom(room.getId(), expirationTime));
    }

    private void expireSingleRoom(Long roomId, LocalDateTime expirationTime) {
        try {
            roomCommandService.expireSingleRoom(roomId, expirationTime);
        } catch (Exception e) {
            log.error("싱글 세션 만료 처리 실패. roomId={}", roomId, e);
        }
    }
}
