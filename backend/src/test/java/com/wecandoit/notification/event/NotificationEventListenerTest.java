package com.wecandoit.notification.event;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;

import com.wecandoit.notification.domain.NotificationType;
import com.wecandoit.notification.service.NotificationCommandService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("알림 이벤트 리스너")
class NotificationEventListenerTest {

    @Mock
    private NotificationCommandService notificationCommandService;
    private NotificationEventListener notificationEventListener;

    @BeforeEach
    void setUp() {
        notificationEventListener = new NotificationEventListener(notificationCommandService);
    }

    @Test
    @DisplayName("이벤트를 받으면 NotificationCommandService.send를 호출한다")
    void handleCallsNotificationCommandServiceSend() {
        // given
        NotificationRequestedEvent event =
                new NotificationRequestedEvent(1L, NotificationType.FRIEND_REQUEST, "제목", "본문", 20L);

        // when
        notificationEventListener.handle(event);

        // then
        then(notificationCommandService).should()
                .send(1L, NotificationType.FRIEND_REQUEST, "제목", "본문", 20L);
    }

    @Test
    @DisplayName("알림 발송 중 예외가 발생해도 리스너 밖으로 전파되지 않는다")
    void handleSwallowsExceptions() {
        // given
        NotificationRequestedEvent event =
                new NotificationRequestedEvent(1L, NotificationType.FRIEND_REQUEST, "제목", "본문", 20L);
        willThrow(new RuntimeException("FCM 발송 실패"))
                .given(notificationCommandService)
                .send(1L, NotificationType.FRIEND_REQUEST, "제목", "본문", 20L);

        // when & then
        assertThatCode(() -> notificationEventListener.handle(event)).doesNotThrowAnyException();
    }
}
