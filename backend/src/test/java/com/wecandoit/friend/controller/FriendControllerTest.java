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
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.friend.dto.FriendResponse;
import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.member.domain.Gender;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
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
                .setCustomArgumentResolvers(
                        new LoginMemberIdArgumentResolver(),
                        new PageableHandlerMethodArgumentResolver()
                )
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
    @DisplayName("친구 목록을 조회하면 친구의 걸음 수와 아바타 정보를 반환한다")
    void getFriendsReturnsFriendResponses() throws Exception {
        // given
        given(friendReadService.getFriends(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.any()
        )).willReturn(new SliceResponse<>(
                List.of(new FriendResponse(
                        2L,
                        "친구",
                        12_500,
                        Gender.FEMALE,
                        "https://example.com/female.png",
                        List.of(new EquippedItemResponse(
                                10L,
                                100L,
                                "빨간 모자",
                                ItemCategory.HAT,
                                "https://example.com/hat.png"
                        ))
                )),
                false
        ));

        // when & then
        mockMvc.perform(get("/friends").param("page", "0").param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].memberId").value(2L))
                .andExpect(jsonPath("$.content[0].nickname").value("친구"))
                .andExpect(jsonPath("$.content[0].weeklySteps").value(12_500))
                .andExpect(jsonPath("$.content[0].gender").value("FEMALE"))
                .andExpect(jsonPath("$.content[0].defaultImageUrl")
                        .value("https://example.com/female.png"))
                .andExpect(jsonPath("$.content[0].equippedItems[0].memberItemId").value(10L))
                .andExpect(jsonPath("$.content[0].equippedItems[0].itemId").value(100L))
                .andExpect(jsonPath("$.content[0].equippedItems[0].name").value("빨간 모자"))
                .andExpect(jsonPath("$.content[0].equippedItems[0].category").value("HAT"))
                .andExpect(jsonPath("$.content[0].equippedItems[0].imageUrl")
                        .value("https://example.com/hat.png"))
                .andExpect(jsonPath("$.totalElements").doesNotExist())
                .andExpect(jsonPath("$.totalPages").doesNotExist())
                .andExpect(jsonPath("$.hasNext").value(false));
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
