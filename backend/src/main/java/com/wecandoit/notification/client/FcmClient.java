package com.wecandoit.notification.client;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class FcmClient {

    private final Optional<FirebaseMessaging> firebaseMessaging;

    /**
     * @return true if the token is invalid/unregistered and should be cleared, false otherwise
     */
    public boolean send(String token, String title, String body) {
        if (firebaseMessaging.isEmpty()) {
            log.warn("FCM 자격증명이 설정되지 않아 발송을 건너뜁니다.");
            return false;
        }

        Message message = Message.builder()
                .setToken(token)
                .setNotification(com.google.firebase.messaging.Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build())
                .build();

        try {
            firebaseMessaging.get().send(message);
            return false;
        } catch (FirebaseMessagingException e) {
            log.error("FCM 발송 실패. errorCode={}", e.getMessagingErrorCode(), e);
            return isInvalidToken(e);
        }
    }

    private boolean isInvalidToken(FirebaseMessagingException e) {
        MessagingErrorCode code = e.getMessagingErrorCode();
        return code == MessagingErrorCode.UNREGISTERED || code == MessagingErrorCode.INVALID_ARGUMENT;
    }
}
