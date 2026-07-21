package com.wecandoit.friend.controller;

import com.wecandoit.friend.service.FriendCommandService;
import com.wecandoit.friend.service.FriendReadService;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.friend.dto.FriendResponse;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("친구 API")
class FriendControllerTest {

    private final FriendReadService friendReadService = Mockito.mock(FriendReadService.class);
    private final FriendCommandService friendCommandService = Mockito.mock(FriendCommandService.class);
    private final MockMvc mockMvc = MockMvcBuilders.standaloneSetup(
                    new FriendController(friendReadService, friendCommandService)
            )
            .setCustomArgumentResolvers(new LoginMemberIdArgumentResolver())
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
    @DisplayName("친구 목록을 조회하면 친구 회원 ID와 닉네임을 반환한다")
    void getFriendsReturnsFriendResponses() throws Exception {
        // given
        when(friendReadService.getFriends(1L)).thenReturn(List.of(new FriendResponse(2L, "친구")));

        // when, then
        mockMvc.perform(get("/friends"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].memberId").value(2L))
                .andExpect(jsonPath("$[0].nickname").value("친구"));
    }

    @Test
    @DisplayName("친구를 삭제하면 204 상태를 반환한다")
    void deleteFriendReturnsNoContent() throws Exception {
        // when, then
        mockMvc.perform(delete("/friends/{friendId}", 2L))
                .andExpect(status().isNoContent());
        verify(friendCommandService).deleteFriend(1L, 2L);
    }
}
