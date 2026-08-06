package com.wecandoit.notification.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.notification.client.FcmClient;
import com.wecandoit.notification.domain.Notification;
import com.wecandoit.notification.domain.NotificationType;
import com.wecandoit.notification.repository.NotificationRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("알림 명령 서비스")
class NotificationCommandServiceTest {

    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private FcmClient fcmClient;
    private NotificationCommandService notificationCommandService;

    @BeforeEach
    void setUp() {
        notificationCommandService = new NotificationCommandService(
                notificationRepository,
                memberRepository,
                fcmClient
        );
    }

    @Test
    @DisplayName("토큰이 있으면 알림을 저장하고 FCM을 발송한다")
    void sendSavesNotificationAndSendsFcm() {
        // given
        Member member = memberWithFcmToken(1L, "token-abc");
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(member));
        given(fcmClient.send("token-abc", "제목", "본문", NotificationType.FRIEND_REQUEST, 20L))
                .willReturn(false);

        // when
        notificationCommandService.send(1L, NotificationType.FRIEND_REQUEST, "제목", "본문", 20L);

        // then
        ArgumentCaptor<Notification> notificationCaptor = ArgumentCaptor.forClass(Notification.class);
        then(notificationRepository).should().save(notificationCaptor.capture());
        assertThat(notificationCaptor.getValue().getTargetId()).isEqualTo(20L);
        then(fcmClient).should().send("token-abc", "제목", "본문", NotificationType.FRIEND_REQUEST, 20L);
        assertThat(member.getFcmToken()).isEqualTo("token-abc");
    }

    @Test
    @DisplayName("토큰이 없으면 DB에는 저장하되 FCM 발송은 스킵한다")
    void sendSkipsFcmWhenTokenMissing() {
        // given
        Member member = memberWithFcmToken(1L, null);
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(member));

        // when
        notificationCommandService.send(1L, NotificationType.FRIEND_REQUEST, "제목", "본문", 20L);

        // then
        then(notificationRepository).should().save(ArgumentMatchers.any(Notification.class));
        then(fcmClient).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("FCM이 무효 토큰 오류를 반환하면 회원의 fcmToken을 정리한다")
    void sendClearsFcmTokenWhenInvalid() {
        // given
        Member member = memberWithFcmToken(1L, "invalid-token");
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(member));
        given(fcmClient.send("invalid-token", "제목", "본문", NotificationType.FRIEND_REQUEST, 20L))
                .willReturn(true);

        // when
        notificationCommandService.send(1L, NotificationType.FRIEND_REQUEST, "제목", "본문", 20L);

        // then
        assertThat(member.getFcmToken()).isNull();
    }

    @Test
    @DisplayName("존재하지 않는 회원에게 알림을 발송하면 실패한다")
    void sendRejectsMissingMember() {
        // given
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() ->
                notificationCommandService.send(1L, NotificationType.FRIEND_REQUEST, "제목", "본문", 20L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
    }

    @Test
    @DisplayName("본인 소유 알림을 읽음 처리한다")
    void markAsReadSucceeds() {
        // given
        Notification notification = notification(10L, 1L);
        given(notificationRepository.findById(10L)).willReturn(Optional.of(notification));

        // when
        notificationCommandService.markAsRead(1L, 10L);

        // then
        assertThat(notification.isRead()).isTrue();
    }

    @Test
    @DisplayName("본인 소유가 아닌 알림을 읽음 처리하면 실패한다")
    void markAsReadRejectsNonOwner() {
        // given
        Notification notification = notification(10L, 1L);
        given(notificationRepository.findById(10L)).willReturn(Optional.of(notification));

        // when & then
        assertThatThrownBy(() -> notificationCommandService.markAsRead(2L, 10L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.NOTIFICATION_ACCESS_FORBIDDEN);
    }

    @Test
    @DisplayName("존재하지 않는 알림을 읽음 처리하면 실패한다")
    void markAsReadRejectsMissingNotification() {
        // given
        given(notificationRepository.findById(10L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> notificationCommandService.markAsRead(1L, 10L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.NOTIFICATION_NOT_FOUND);
    }

    private Member memberWithFcmToken(Long id, String fcmToken) {
        Member member = Member.create(id + "@example.com", "password", "닉네임" + id, null, Gender.MALE);
        ReflectionTestUtils.setField(member, "id", id);
        member.updateFcmToken(fcmToken);
        return member;
    }

    private Notification notification(Long id, Long memberId) {
        Notification notification =
                Notification.create(memberId, NotificationType.FRIEND_REQUEST, "제목", "본문", 20L);
        ReflectionTestUtils.setField(notification, "id", id);
        return notification;
    }
}
