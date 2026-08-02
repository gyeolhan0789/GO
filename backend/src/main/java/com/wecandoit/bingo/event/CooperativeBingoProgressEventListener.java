package com.wecandoit.bingo.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class CooperativeBingoProgressEventListener {

    private static final String ROOM_TOPIC_PREFIX = "/topic/rooms/";
    private static final String BINGO_PROGRESS_TOPIC_SUFFIX = "/bingo-progress";

    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(CooperativeBingoProgressUpdatedEvent event) {
        String destination = ROOM_TOPIC_PREFIX + event.roomId() + BINGO_PROGRESS_TOPIC_SUFFIX;
        try {
            messagingTemplate.convertAndSend(destination, event);
        } catch (Exception exception) {
            log.error(
                    "협동 빙고 진행 이벤트 전송 실패. roomId={}, cellId={}",
                    event.roomId(),
                    event.cellId(),
                    exception
            );
        }
    }
}
