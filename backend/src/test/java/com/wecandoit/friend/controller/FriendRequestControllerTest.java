package com.wecandoit.friend.controller;

import com.wecandoit.friend.service.FriendRequestCommandService;
import com.wecandoit.friend.service.FriendRequestReadService;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.friend.dto.ReceivedFriendRequestResponse;
import com.wecandoit.friend.dto.SendFriendRequest;
import com.wecandoit.friend.dto.SentFriendRequestResponse;
import com.wecandoit.avatar.dto.EquippedItemDto;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.member.domain.Gender;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
@DisplayName("친구 요청 API")
class FriendRequestControllerTest {

    @Mock
    private FriendRequestReadService friendRequestReadService;
    @Mock
    private FriendRequestCommandService friendRequestCommandService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                        new FriendRequestController(friendRequestReadService, friendRequestCommandService)
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
    @DisplayName("친구 요청을 전송하면 201 상태를 반환한다")
    void sendRequestReturnsCreated() throws Exception {
        // when & then
        mockMvc.perform(post("/friend-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"inviteeId\":2}"))
                .andExpect(status().isCreated());
        then(friendRequestCommandService).should().sendRequest(1L, new SendFriendRequest(2L));
    }

    @Test
    @DisplayName("받은 친구 요청을 조회하면 요청자의 아바타 정보와 생성 시각을 반환한다")
    void getReceivedRequestsReturnsPendingRequests() throws Exception {
        // given
        LocalDateTime createdAt = LocalDateTime.of(2026, 7, 19, 12, 0);
        given(friendRequestReadService.getReceivedRequests(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.any()
        )).willReturn(new SliceResponse<>(
                List.of(new ReceivedFriendRequestResponse(
                        10L,
                        2L,
                        "요청자",
                        createdAt,
                        Gender.MALE,
                        "https://example.com/male.png",
                        List.of(new EquippedItemDto(
                                11L,
                                101L,
                                "파란 모자",
                                ItemCategory.HAT,
                                "https://example.com/blue-hat.png"
                        ))
                )),
                false
        ));

        // when & then
        mockMvc.perform(get("/friend-requests").param("page", "0").param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].requestId").value(10L))
                .andExpect(jsonPath("$.content[0].inviterId").value(2L))
                .andExpect(jsonPath("$.content[0].inviterNickname").value("요청자"))
                .andExpect(jsonPath("$.content[0].createdAt").value("2026-07-19T12:00:00"))
                .andExpect(jsonPath("$.content[0].gender").value("MALE"))
                .andExpect(jsonPath("$.content[0].defaultImageUrl")
                        .value("https://example.com/male.png"))
                .andExpect(jsonPath("$.content[0].equippedItems[0].memberItemId").value(11L))
                .andExpect(jsonPath("$.content[0].equippedItems[0].itemId").value(101L))
                .andExpect(jsonPath("$.content[0].equippedItems[0].name").value("파란 모자"))
                .andExpect(jsonPath("$.content[0].equippedItems[0].category").value("HAT"))
                .andExpect(jsonPath("$.content[0].equippedItems[0].imageUrl")
                        .value("https://example.com/blue-hat.png"))
                .andExpect(jsonPath("$.hasNext").value(false))
                .andExpect(jsonPath("$.totalElements").doesNotExist());
    }

    @Test
    @DisplayName("보낸 친구 요청을 조회하면 요청 대상 정보와 생성 시각을 반환한다")
    void getSentRequestsReturnsPendingRequests() throws Exception {
        // given
        LocalDateTime createdAt = LocalDateTime.of(2026, 7, 27, 10, 0);
        given(friendRequestReadService.getSentRequests(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.any()
        )).willReturn(new SliceResponse<>(
                List.of(new SentFriendRequestResponse(10L, 2L, "받는사람", createdAt)),
                false
        ));

        // when & then
        mockMvc.perform(get("/friend-requests/sent").param("page", "0").param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].requestId").value(10L))
                .andExpect(jsonPath("$.content[0].inviteeId").value(2L))
                .andExpect(jsonPath("$.content[0].inviteeNickname").value("받는사람"))
                .andExpect(jsonPath("$.content[0].createdAt").value("2026-07-27T10:00:00"))
                .andExpect(jsonPath("$.content[0].email").doesNotExist())
                .andExpect(jsonPath("$.content[0].password").doesNotExist())
                .andExpect(jsonPath("$.totalPages").doesNotExist())
                .andExpect(jsonPath("$.hasNext").value(false));
    }

    @Test
    @DisplayName("보낸 친구 요청이 없으면 빈 배열을 반환한다")
    void getSentRequestsReturnsEmptyArray() throws Exception {
        // given
        given(friendRequestReadService.getSentRequests(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.any()
        )).willReturn(new SliceResponse<>(List.of(), false));

        // when & then
        mockMvc.perform(get("/friend-requests/sent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content").isEmpty())
                .andExpect(jsonPath("$.hasNext").value(false));
    }

    @Test
    @DisplayName("인증되지 않은 보낸 친구 요청 조회는 401 응답을 반환한다")
    void getSentRequestsRejectsUnauthenticatedRequest() throws Exception {
        // given
        SecurityContextHolder.clearContext();

        // when & then
        mockMvc.perform(get("/friend-requests/sent"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    @DisplayName("보낸 친구 요청을 취소하면 204 상태와 빈 본문을 반환한다")
    void cancelRequestReturnsNoContent() throws Exception {
        // when & then
        mockMvc.perform(delete("/friend-requests/{requestId}", 10L))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
        then(friendRequestCommandService).should().cancelRequest(1L, 10L);
    }

    @Test
    @DisplayName("인증되지 않은 친구 요청 취소는 401 응답을 반환한다")
    void cancelRequestRejectsUnauthenticatedRequest() throws Exception {
        // given
        SecurityContextHolder.clearContext();

        // when & then
        mockMvc.perform(delete("/friend-requests/{requestId}", 10L))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증이 필요합니다."));
    }

    @Test
    @DisplayName("친구 요청을 수락하면 204 상태를 반환한다")
    void acceptRequestReturnsNoContent() throws Exception {
        // when & then
        mockMvc.perform(patch("/friend-requests/{requestId}/accept", 10L))
                .andExpect(status().isNoContent());
        then(friendRequestCommandService).should().acceptRequest(1L, 10L);
    }

    @Test
    @DisplayName("친구 요청을 거절하면 204 상태를 반환한다")
    void rejectRequestReturnsNoContent() throws Exception {
        // when & then
        mockMvc.perform(patch("/friend-requests/{requestId}/reject", 10L))
                .andExpect(status().isNoContent());
        then(friendRequestCommandService).should().rejectRequest(1L, 10L);
    }
}
