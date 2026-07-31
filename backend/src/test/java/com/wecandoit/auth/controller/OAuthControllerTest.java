package com.wecandoit.auth.controller;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.wecandoit.auth.dto.AuthTokens;
import com.wecandoit.auth.dto.OAuthVerifyResponse;
import com.wecandoit.auth.service.OAuthService;
import com.wecandoit.member.domain.AuthProvider;
import com.wecandoit.member.domain.Gender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class OAuthControllerTest {

    @Mock
    private OAuthService oAuthService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new OAuthController(oAuthService)).build();
    }

    @Test
    void googleVerifyReturnsLoginStatusWithoutSettingCookie() throws Exception {
        given(oAuthService.verify(AuthProvider.GOOGLE, "id-token"))
                .willReturn(OAuthVerifyResponse.login(new AuthTokens("access-token", "refresh-token")));

        mockMvc.perform(post("/auth/oauth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"id-token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LOGIN"))
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.refreshToken").value("refresh-token"))
                .andExpect(header().doesNotExist("Set-Cookie"));
    }

    @Test
    void kakaoVerifyReturnsSignupRequiredWithSignupToken() throws Exception {
        given(oAuthService.verify(AuthProvider.KAKAO, "id-token"))
                .willReturn(OAuthVerifyResponse.signupRequired("signup-token-1"));

        mockMvc.perform(post("/auth/oauth/kakao")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"id-token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SIGNUP_REQUIRED"))
                .andExpect(jsonPath("$.signupToken").value("signup-token-1"))
                .andExpect(header().doesNotExist("Set-Cookie"));
    }

    @Test
    void googleSignupReturnsBothTokensWithoutSettingCookie() throws Exception {
        given(oAuthService.completeSignup(AuthProvider.GOOGLE, "signup-token-1", Gender.MALE))
                .willReturn(new AuthTokens("access-token", "refresh-token"));

        mockMvc.perform(post("/auth/oauth/google/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"signupToken\":\"signup-token-1\",\"gender\":\"MALE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.refreshToken").value("refresh-token"))
                .andExpect(header().doesNotExist("Set-Cookie"));
    }

    @Test
    void kakaoSignupReturnsBothTokensWithoutSettingCookie() throws Exception {
        given(oAuthService.completeSignup(AuthProvider.KAKAO, "signup-token-2", Gender.FEMALE))
                .willReturn(new AuthTokens("access-token", "refresh-token"));

        mockMvc.perform(post("/auth/oauth/kakao/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"signupToken\":\"signup-token-2\",\"gender\":\"FEMALE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.refreshToken").value("refresh-token"))
                .andExpect(header().doesNotExist("Set-Cookie"));
    }
}
