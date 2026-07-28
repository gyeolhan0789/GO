package com.wecandoit.auth.controller;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.wecandoit.auth.dto.AuthTokens;
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
    void googleLoginReturnsBothTokensWithoutSettingCookie() throws Exception {
        given(oAuthService.oauthLogin(AuthProvider.GOOGLE, "id-token", Gender.MALE))
                .willReturn(new AuthTokens("access-token", "refresh-token"));

        mockMvc.perform(post("/auth/oauth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"id-token\",\"gender\":\"MALE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.refreshToken").value("refresh-token"))
                .andExpect(header().doesNotExist("Set-Cookie"));
    }

    @Test
    void kakaoLoginReturnsBothTokensWithoutSettingCookie() throws Exception {
        given(oAuthService.oauthLogin(AuthProvider.KAKAO, "id-token", Gender.FEMALE))
                .willReturn(new AuthTokens("access-token", "refresh-token"));

        mockMvc.perform(post("/auth/oauth/kakao")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"id-token\",\"gender\":\"FEMALE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.refreshToken").value("refresh-token"))
                .andExpect(header().doesNotExist("Set-Cookie"));
    }
}
