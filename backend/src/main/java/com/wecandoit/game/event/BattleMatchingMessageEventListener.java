package com.wecandoit.game.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class BattleMatchingMessageEventListener {

    private static final String BATTLE_QUEUE_DESTINATION = "/queue/battle";

    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(BattleMatchingMessageRequestedEvent event) {
        try {
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(event.recipientMemberId()),
                    BATTLE_QUEUE_DESTINATION,
                    event.message()
            );
        } catch (Exception exception) {
            log.error(
                    "배틀 매칭 이벤트 전송 실패. recipientMemberId={}, type={}",
                    event.recipientMemberId(),
                    event.message().type(),
                    exception
            );
        }
    }
}
