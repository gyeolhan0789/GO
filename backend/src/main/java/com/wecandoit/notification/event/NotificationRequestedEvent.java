package com.wecandoit.notification.event;

import com.wecandoit.notification.domain.NotificationType;

public record NotificationRequestedEvent(
        Long recipientMemberId,
        NotificationType type,
        String title,
        String body,
        Long targetId
) {
}
