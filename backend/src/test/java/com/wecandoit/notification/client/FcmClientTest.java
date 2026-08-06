package com.wecandoit.notification.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.entry;
import static org.mockito.BDDMockito.then;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.wecandoit.notification.domain.NotificationType;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("FCM 클라이언트")
class FcmClientTest {

    @Mock
    private FirebaseMessaging firebaseMessaging;
    private FcmClient fcmClient;

    @BeforeEach
    void setUp() {
        fcmClient = new FcmClient(Optional.of(firebaseMessaging));
    }

    @Test
    @DisplayName("targetId가 있으면 data에 type과 targetId를 문자열로 담아 발송한다")
    void sendPutsTypeAndTargetIdIntoData() throws Exception {
        // when
        boolean invalidToken = fcmClient.send("token-abc", "제목", "본문", NotificationType.FRIEND_REQUEST, 30L);

        // then
        assertThat(invalidToken).isFalse();
        assertThat(capturedData()).containsExactlyInAnyOrderEntriesOf(Map.of(
                "type", "FRIEND_REQUEST",
                "targetId", "30"
        ));
    }

    @Test
    @DisplayName("targetId가 없으면 data에 targetId 키를 담지 않는다")
    void sendOmitsTargetIdWhenNull() throws Exception {
        // when
        boolean invalidToken = fcmClient.send("token-abc", "제목", "본문", NotificationType.WALK_START, null);

        // then
        assertThat(invalidToken).isFalse();
        assertThat(capturedData()).containsOnly(entry("type", "WALK_START"));
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> capturedData() throws Exception {
        ArgumentCaptor<Message> captor = ArgumentCaptor.forClass(Message.class);
        then(firebaseMessaging).should().send(captor.capture());
        return (Map<String, String>) ReflectionTestUtils.getField(captor.getValue(), "data");
    }
}
