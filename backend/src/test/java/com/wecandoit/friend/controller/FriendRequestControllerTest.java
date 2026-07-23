package com.wecandoit.friend.controller;

import com.wecandoit.friend.service.FriendRequestCommandService;
import com.wecandoit.friend.service.FriendRequestReadService;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.friend.dto.ReceivedFriendRequestResponse;
import com.wecandoit.friend.dto.SendFriendRequest;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("친구 요청 API")
class FriendRequestControllerTest {

    private final FriendRequestReadService friendRequestReadService = Mockito.mock(FriendRequestReadService.class);
    private final FriendRequestCommandService friendRequestCommandService = Mockito.mock(
            FriendRequestCommandService.class
    );
    private final MockMvc mockMvc = MockMvcBuilders.standaloneSetup(
                    new FriendRequestController(friendRequestReadService, friendRequestCommandService)
            )
            .setControllerAdvice(new CustomExceptionHandler())
            .setCustomArgumentResolvers(new LoginMemberIdArgumentResolver())
            .setMessageConverters(new MappingJackson2HttpMessageConverter(
                    Jackson2ObjectMapperBuilder.json()
                            .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                            .build()
            ))
            .build();

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("친구 요청을 전송하면 201 상태를 반환한다")
    void sendRequestReturnsCreated() throws Exception {
        // when, then
        mockMvc.perform(post("/friend-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"inviteeId\":2}"))
                .andExpect(status().isCreated());
        verify(friendRequestCommandService).sendRequest(1L, new SendFriendRequest(2L));
    }

    @Test
    @DisplayName("받은 친구 요청을 조회하면 요청자 정보와 생성 시각을 반환한다")
    void getReceivedRequestsReturnsPendingRequests() throws Exception {
        // given
        LocalDateTime createdAt = LocalDateTime.of(2026, 7, 19, 12, 0);
        when(friendRequestReadService.getReceivedRequests(1L)).thenReturn(List.of(
                new ReceivedFriendRequestResponse(10L, 2L, "요청자", createdAt)
        ));

        // when, then
        mockMvc.perform(get("/friend-requests"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].requestId").value(10L))
                .andExpect(jsonPath("$[0].inviterId").value(2L))
                .andExpect(jsonPath("$[0].inviterNickname").value("요청자"))
                .andExpect(jsonPath("$[0].createdAt").value("2026-07-19T12:00:00"));
    }

    @Test
    @DisplayName("친구 요청을 수락하면 204 상태를 반환한다")
    void acceptRequestReturnsNoContent() throws Exception {
        // when, then
        mockMvc.perform(patch("/friend-requests/{requestId}/accept", 10L))
                .andExpect(status().isNoContent());
        verify(friendRequestCommandService).acceptRequest(1L, 10L);
    }

    @Test
    @DisplayName("친구 요청을 거절하면 204 상태를 반환한다")
    void rejectRequestReturnsNoContent() throws Exception {
        // when, then
        mockMvc.perform(patch("/friend-requests/{requestId}/reject", 10L))
                .andExpect(status().isNoContent());
        verify(friendRequestCommandService).rejectRequest(1L, 10L);
    }
}
