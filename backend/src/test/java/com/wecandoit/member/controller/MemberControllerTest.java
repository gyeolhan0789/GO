package com.wecandoit.member.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.member.dto.MemberRelationshipStatus;
import com.wecandoit.member.dto.MemberSearchResponse;
import com.wecandoit.member.service.MemberReadService;
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

@DisplayName("회원 검색 API")
class MemberControllerTest {

    private final MemberReadService memberReadService = Mockito.mock(MemberReadService.class);
    private final MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new MemberController(memberReadService))
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
    @DisplayName("닉네임 검색 결과에 회원 ID, 닉네임, 관계 상태를 반환한다")
    void searchMembersReturnsRelationshipStatus() throws Exception {
        // given
        when(memberReadService.searchMembers(1L, "산책")).thenReturn(List.of(
                new MemberSearchResponse(2L, "산책친구", MemberRelationshipStatus.FRIEND)
        ));

        // when, then
        mockMvc.perform(get("/members/search").param("keyword", "산책"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].memberId").value(2L))
                .andExpect(jsonPath("$[0].nickname").value("산책친구"))
                .andExpect(jsonPath("$[0].relationshipStatus").value("FRIEND"));
    }
}
