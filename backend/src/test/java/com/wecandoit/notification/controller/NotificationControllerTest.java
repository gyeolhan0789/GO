package com.wecandoit.notification.controller;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.notification.domain.NotificationType;
import com.wecandoit.notification.dto.NotificationResponse;
import com.wecandoit.notification.service.NotificationCommandService;
import com.wecandoit.notification.service.NotificationReadService;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
@DisplayName("알림 API")
class NotificationControllerTest {

    @Mock
    private NotificationReadService notificationReadService;
    @Mock
    private NotificationCommandService notificationCommandService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                        new NotificationController(notificationReadService, notificationCommandService)
                )
                .setControllerAdvice(new CustomExceptionHandler())
                .setCustomArgumentResolvers(
                        new LoginMemberIdArgumentResolver(),
                        new PageableHandlerMethodArgumentResolver()
                )
                .setMessageConverters(new MappingJackson2HttpMessageConverter(
                        Jackson2ObjectMapperBuilder.json()
                                .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                                .build()
                ))
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("알림 목록을 조회하면 알림 정보를 반환한다")
    void getNotificationsReturnsNotifications() throws Exception {
        // given
        LocalDateTime createdAt = LocalDateTime.of(2026, 7, 27, 12, 0);
        given(notificationReadService.getNotifications(ArgumentMatchers.eq(1L), ArgumentMatchers.any()))
                .willReturn(new SliceResponse<>(
                        List.of(new NotificationResponse(
                                10L, NotificationType.FRIEND_REQUEST, "친구 요청이 도착했어요",
                                "누군가 친구 요청을 보냈어요.", 20L, false, createdAt
                        )),
                        false
                ));

        // when & then
        mockMvc.perform(get("/notifications").param("page", "0").param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(10L))
                .andExpect(jsonPath("$.content[0].type").value("FRIEND_REQUEST"))
                .andExpect(jsonPath("$.content[0].title").value("친구 요청이 도착했어요"))
                .andExpect(jsonPath("$.content[0].targetId").value(20L))
                .andExpect(jsonPath("$.content[0].read").value(false))
                .andExpect(jsonPath("$.hasNext").value(false));
    }

    @Test
    @DisplayName("인증되지 않은 알림 목록 조회는 401 응답을 반환한다")
    void getNotificationsRejectsUnauthenticatedRequest() throws Exception {
        // given
        SecurityContextHolder.clearContext();

        // when & then
        mockMvc.perform(get("/notifications"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("알림을 읽음 처리하면 204 상태를 반환한다")
    void markAsReadReturnsNoContent() throws Exception {
        // when & then
        mockMvc.perform(patch("/notifications/{notificationId}/read", 10L))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
        then(notificationCommandService).should().markAsRead(1L, 10L);
    }

    @Test
    @DisplayName("본인 소유가 아닌 알림을 읽음 처리하면 403 응답을 반환한다")
    void markAsReadRejectsForbiddenAccess() throws Exception {
        // given
        org.mockito.BDDMockito.willThrow(new CustomException(ErrorCode.NOTIFICATION_ACCESS_FORBIDDEN))
                .given(notificationCommandService).markAsRead(1L, 10L);

        // when & then
        mockMvc.perform(patch("/notifications/{notificationId}/read", 10L))
                .andExpect(status().isForbidden());
    }
}
