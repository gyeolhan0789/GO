package com.wecandoit.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.jwt.JwtProvider;
import com.wecandoit.common.jwt.JwtProperties;
import com.wecandoit.common.jwt.TokenRepository;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.HandlerExceptionResolver;

@DisplayName("JWT 인증 필터")
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class JwtAuthenticationFilterTest {

    private final JwtProvider jwtProvider = new JwtProvider(
            jwtProperties(1_800_000L, 1_209_600_000L)
    );
    @Mock
    private TokenRepository tokenRepository;
    @Mock
    private HandlerExceptionResolver handlerExceptionResolver;
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @BeforeEach
    void setUp() {
        jwtAuthenticationFilter = new JwtAuthenticationFilter(
                jwtProvider,
                tokenRepository,
                handlerExceptionResolver
        );
        given(tokenRepository.isBlacklisted(Mockito.anyString())).willReturn(false);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("유효한 Bearer Access Token이면 DB 조회 없이 claims로 인증 정보를 구성한다")
    void authenticatesAccessTokenFromClaims() throws Exception {
        // given
        String accessToken = jwtProvider.createAccessToken(1L, "USER");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + accessToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = Mockito.mock(FilterChain.class);

        // when
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // then
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertThat(authentication).isNotNull();
        assertThat(authentication.getPrincipal()).isEqualTo(1L);
        assertThat(authentication.getAuthorities())
                .extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_USER");
        then(filterChain).should().doFilter(request, response);
    }

    @Test
    @DisplayName("블랙리스트에 등록된 Access Token은 TOKEN_INVALID로 거부한다")
    void rejectsBlacklistedAccessToken() throws Exception {
        // given
        String accessToken = jwtProvider.createAccessToken(1L, "USER");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + accessToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = Mockito.mock(FilterChain.class);

        given(tokenRepository.isBlacklisted(any())).willReturn(true);

        // when
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // then
        ArgumentCaptor<CustomException> exceptionCaptor = ArgumentCaptor.forClass(CustomException.class);
        then(handlerExceptionResolver).should().resolveException(
                eq(request),
                eq(response),
                isNull(),
                exceptionCaptor.capture()
        );
        assertThat(exceptionCaptor.getValue().getErrorCode()).isEqualTo(ErrorCode.TOKEN_INVALID);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        then(filterChain).should(never()).doFilter(request, response);
    }

    @Test
    @DisplayName("Bearer 헤더에 Refresh Token을 사용하면 TOKEN_INVALID로 거부한다")
    void rejectsRefreshTokenInAuthorizationHeader() throws Exception {
        // given
        String refreshToken = jwtProvider.createRefreshToken(1L, "USER");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + refreshToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = Mockito.mock(FilterChain.class);

        // when
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // then
        ArgumentCaptor<CustomException> exceptionCaptor = ArgumentCaptor.forClass(CustomException.class);
        then(handlerExceptionResolver).should().resolveException(
                eq(request),
                eq(response),
                isNull(),
                exceptionCaptor.capture()
        );
        assertThat(exceptionCaptor.getValue().getErrorCode()).isEqualTo(ErrorCode.TOKEN_INVALID);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        then(filterChain).should(never()).doFilter(request, response);
    }

    @Test
    @DisplayName("만료된 Access Token은 TOKEN_EXPIRED로 매핑한다")
    void mapsExpiredAccessTokenToTokenExpired() throws Exception {
        // given
        JwtProvider expiringProvider = new JwtProvider(
                jwtProperties(-1L, 1_209_600_000L)
        );
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
                expiringProvider,
                tokenRepository,
                handlerExceptionResolver
        );
        String accessToken = expiringProvider.createAccessToken(1L, "USER");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + accessToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = Mockito.mock(FilterChain.class);

        // when
        filter.doFilter(request, response, filterChain);

        // then
        ArgumentCaptor<CustomException> exceptionCaptor = ArgumentCaptor.forClass(CustomException.class);
        then(handlerExceptionResolver).should().resolveException(
                eq(request),
                eq(response),
                isNull(),
                exceptionCaptor.capture()
        );
        assertThat(exceptionCaptor.getValue().getErrorCode()).isEqualTo(ErrorCode.TOKEN_EXPIRED);
        then(filterChain).should(never()).doFilter(request, response);
    }

    @Test
    @DisplayName("토큰 재발급 경로는 Access Token 필터링을 건너뛴다")
    void skipsAccessTokenFilteringForReissuePath() throws Exception {
        // given
        String accessToken = jwtProvider.createAccessToken(1L, "USER");
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/auth/reissue");
        request.setServletPath("/auth/reissue");
        request.addHeader("Authorization", "Bearer " + accessToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = Mockito.mock(FilterChain.class);

        // when
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // then
        then(filterChain).should().doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("로그인 경로는 만료된 토큰이 있어도 필터링 없이 통과시킨다")
    void skipsFilteringForLoginPathEvenWithExpiredToken() throws Exception {
        // given
        JwtProvider expiringProvider = new JwtProvider(
                jwtProperties(-1L, 1_209_600_000L)
        );
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
                expiringProvider,
                tokenRepository,
                handlerExceptionResolver
        );
        String expiredToken = expiringProvider.createAccessToken(1L, "USER");
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/auth/login");
        request.setServletPath("/auth/login");
        request.addHeader("Authorization", "Bearer " + expiredToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = Mockito.mock(FilterChain.class);

        // when
        filter.doFilter(request, response, filterChain);

        // then
        then(filterChain).should().doFilter(request, response);
        then(handlerExceptionResolver).should(never()).resolveException(any(), any(), any(), any());
    }

    @Test
    @DisplayName("회원가입 경로는 무효한 토큰이 있어도 필터링 없이 통과시킨다")
    void skipsFilteringForSignupPathEvenWithInvalidToken() throws Exception {
        // given
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/auth/signup");
        request.setServletPath("/auth/signup");
        request.addHeader("Authorization", "Bearer invalid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = Mockito.mock(FilterChain.class);

        // when
        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        // then
        then(filterChain).should().doFilter(request, response);
        then(handlerExceptionResolver).should(never()).resolveException(any(), any(), any(), any());
    }

    private JwtProperties jwtProperties(long accessTokenExpirationMillis, long refreshTokenExpirationMillis) {
        return new JwtProperties(
                "test-only-jwt-secret-key-please-change-me-1234567890",
                accessTokenExpirationMillis,
                refreshTokenExpirationMillis
        );
    }
}
