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
public class BattleBingoProgressEventListener {

    private static final String ROOM_TOPIC_PREFIX = "/topic/rooms/";
    private static final String BATTLE_PROGRESS_TOPIC_SUFFIX = "/battle-progress";

    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(BattleBingoProgressUpdatedEvent event) {
        String destination = ROOM_TOPIC_PREFIX + event.roomId() + BATTLE_PROGRESS_TOPIC_SUFFIX;
        try {
            messagingTemplate.convertAndSend(destination, event);
        } catch (Exception exception) {
            log.error(
                    "대결 빙고 진행률 이벤트 전송 실패. roomId={}, participantMemberId={}",
                    event.roomId(),
                    event.participantMemberId(),
                    exception
            );
        }
    }
}
