package com.wecandoit.member.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.PageResponse;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.member.domain.Region;
import com.wecandoit.member.dto.MemberProfileUpdateRequest;
import com.wecandoit.member.dto.MemberRelationshipStatus;
import com.wecandoit.member.dto.MemberSearchResponse;
import com.wecandoit.member.dto.PasswordChangeRequest;
import com.wecandoit.member.service.MemberReadService;
import com.wecandoit.member.service.MemberService;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("회원 API")
@ExtendWith(MockitoExtension.class)
class MemberControllerTest {

    @Mock
    private MemberReadService memberReadService;
    @Mock
    private MemberService memberService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new MemberController(memberReadService, memberService))
                .setControllerAdvice(new CustomExceptionHandler())
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
    @DisplayName("닉네임 검색 결과에 회원 ID, 닉네임, 관계 상태를 반환한다")
    void searchMembersReturnsRelationshipStatus() throws Exception {
        // given
        given(memberReadService.searchMembers(eq(1L), eq("산책"), any())).willReturn(
                new PageResponse<>(
                        List.of(new MemberSearchResponse(
                                2L,
                                "산책친구",
                                MemberRelationshipStatus.FRIEND
                        )),
                        1, 1, 0, 20, false
                )
        );

        // when & then
        mockMvc.perform(get("/members/search")
                        .param("keyword", "산책")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].memberId").value(2L))
                .andExpect(jsonPath("$.content[0].nickname").value("산책친구"))
                .andExpect(jsonPath("$.content[0].relationshipStatus").value("FRIEND"))
                .andExpect(jsonPath("$.currentPage").value(0))
                .andExpect(jsonPath("$.size").value(20));
    }

    @Test
    @DisplayName("닉네임과 지역을 함께 수정한다")
    void updateProfileUpdatesNicknameAndRegion() throws Exception {
        // given
        MemberProfileUpdateRequest request = new MemberProfileUpdateRequest("새닉네임", Region.BUSAN);

        // when & then
        mockMvc.perform(patch("/members/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        then(memberService).should().updateProfile(eq(1L), any(MemberProfileUpdateRequest.class));
    }

    @Test
    @DisplayName("존재하지 않는 지역 값으로 요청하면 프로필 수정에 실패한다")
    void updateProfileRejectsInvalidRegionValue() throws Exception {
        // given
        String invalidRegionJson = "{\"nickname\":null,\"region\":\"ATLANTIS\"}";

        // when & then
        mockMvc.perform(patch("/members/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRegionJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("닉네임이 중복되면 프로필 수정에 실패한다")
    void updateProfileRejectsDuplicateNickname() throws Exception {
        // given
        MemberProfileUpdateRequest request = new MemberProfileUpdateRequest("중복닉네임", null);
        willThrow(new CustomException(ErrorCode.DUPLICATE_NICKNAME))
                .given(memberService).updateProfile(eq(1L), any(MemberProfileUpdateRequest.class));

        // when & then
        mockMvc.perform(patch("/members/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("현재 비밀번호와 새 비밀번호로 비밀번호를 변경한다")
    void changePasswordSucceeds() throws Exception {
        // given
        PasswordChangeRequest request = new PasswordChangeRequest("oldPassword1!", "newPassword1!");

        // when & then
        mockMvc.perform(patch("/members/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        then(memberService).should().changePassword(eq(1L), any(PasswordChangeRequest.class));
    }

    @Test
    @DisplayName("현재 비밀번호가 일치하지 않으면 비밀번호 변경에 실패한다")
    void changePasswordRejectsWrongCurrentPassword() throws Exception {
        // given
        PasswordChangeRequest request = new PasswordChangeRequest("wrongPassword1!", "newPassword1!");
        willThrow(new CustomException(ErrorCode.INVALID_PASSWORD))
                .given(memberService).changePassword(eq(1L), any(PasswordChangeRequest.class));

        // when & then
        mockMvc.perform(patch("/members/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}
