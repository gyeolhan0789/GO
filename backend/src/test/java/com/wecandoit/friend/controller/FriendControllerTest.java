package com.wecandoit.friend.controller;

import com.wecandoit.friend.service.FriendCommandService;
import com.wecandoit.friend.service.FriendReadService;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
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
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
@DisplayName("친구 API")
class FriendControllerTest {

    @Mock
    private FriendReadService friendReadService;
    @Mock
    private FriendCommandService friendCommandService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                        new FriendController(friendReadService, friendCommandService)
                )
                .setCustomArgumentResolvers(new LoginMemberIdArgumentResolver())
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
    @DisplayName("친구 목록을 조회하면 친구 회원 ID와 닉네임을 반환한다")
    void getFriendsReturnsFriendResponses() throws Exception {
        // given
        given(friendReadService.getFriends(1L)).willReturn(List.of(new FriendResponse(2L, "친구")));

        // when & then
        mockMvc.perform(get("/friends"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].memberId").value(2L))
                .andExpect(jsonPath("$[0].nickname").value("친구"));
    }

    @Test
    @DisplayName("친구를 삭제하면 204 상태를 반환한다")
    void deleteFriendReturnsNoContent() throws Exception {
        // when & then
        mockMvc.perform(delete("/friends/{friendId}", 2L))
                .andExpect(status().isNoContent());
        then(friendCommandService).should().deleteFriend(1L, 2L);
    }
}
