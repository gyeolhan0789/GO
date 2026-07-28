package com.wecandoit.notification.event;

import com.wecandoit.notification.service.NotificationCommandService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationCommandService notificationCommandService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(NotificationRequestedEvent event) {
        try {
            notificationCommandService.send(
                    event.recipientMemberId(),
                    event.type(),
                    event.title(),
                    event.body()
            );
        } catch (Exception e) {
            log.error("알림 발송 실패. memberId={}, type={}", event.recipientMemberId(), event.type(), e);
        }
    }
}
