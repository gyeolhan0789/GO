package com.wecandoit.bingo.scheduler;

import com.wecandoit.bingo.service.BingoCommandService;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.repository.RoomRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BingoBoardRenewalScheduler {

    private final RoomRepository roomRepository;
    private final BingoCommandService bingoCommandService;

    @Scheduled(cron = "0 0 * * * *")
    public void renewExpiredBoards() {
        List<Room> rooms = roomRepository.findAllByStatus(GameRoomStatus.IN_PROGRESS);
        for (Room room : rooms) {
            try {
                bingoCommandService.autoRenewBoard(room.getId());
            } catch (Exception e) {
                log.error("빙고판 자동 갱신 실패. roomId={}", room.getId(), e);
            }
        }
    }
}
