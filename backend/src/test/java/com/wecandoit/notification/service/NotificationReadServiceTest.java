package com.wecandoit.notification.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.notification.domain.Notification;
import com.wecandoit.notification.domain.NotificationType;
import com.wecandoit.notification.dto.NotificationResponse;
import com.wecandoit.notification.repository.NotificationRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.SliceImpl;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("알림 조회 서비스")
class NotificationReadServiceTest {

    @Mock
    private NotificationRepository notificationRepository;
    private NotificationReadService notificationReadService;

    @BeforeEach
    void setUp() {
        notificationReadService = new NotificationReadService(notificationRepository);
    }

    @Test
    @DisplayName("본인의 알림 목록을 페이징하여 조회한다")
    void getNotificationsReturnsSlice() {
        // given
        Notification notification =
                Notification.create(1L, NotificationType.FRIEND_REQUEST, "제목", "본문", 20L);
        ReflectionTestUtils.setField(notification, "id", 10L);
        given(notificationRepository.findAllByMemberIdOrderByCreatedAtDescIdDesc(
                ArgumentMatchers.eq(1L), ArgumentMatchers.any()))
                .willReturn(new SliceImpl<>(List.of(notification), PageRequest.of(0, 20), false));

        // when
        SliceResponse<NotificationResponse> response =
                notificationReadService.getNotifications(1L, PageRequest.of(0, 20));

        // then
        assertThat(response.content()).hasSize(1);
        assertThat(response.content().get(0).id()).isEqualTo(10L);
        assertThat(response.content().get(0).type()).isEqualTo(NotificationType.FRIEND_REQUEST);
        assertThat(response.content().get(0).targetId()).isEqualTo(20L);
        assertThat(response.hasNext()).isFalse();
    }
}
