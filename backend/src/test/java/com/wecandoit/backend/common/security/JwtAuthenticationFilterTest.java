package com.wecandoit.backend.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.wecandoit.backend.common.exception.CustomException;
import com.wecandoit.backend.common.exception.ErrorCode;
import com.wecandoit.backend.common.jwt.JwtProvider;
import com.wecandoit.backend.common.jwt.JwtProperties;
import com.wecandoit.backend.common.jwt.TokenRepository;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.HandlerExceptionResolver;

@DisplayName("JWT 인증 필터")
class JwtAuthenticationFilterTest {

    private final JwtProvider jwtProvider = new JwtProvider(
            jwtProperties(1_800_000L, 1_209_600_000L)
    );
    private final TokenRepository tokenRepository = Mockito.mock(TokenRepository.class);
    private final HandlerExceptionResolver handlerExceptionResolver = Mockito.mock(HandlerExceptionResolver.class);
    private final JwtAuthenticationFilter jwtAuthenticationFilter = new JwtAuthenticationFilter(
            jwtProvider,
            tokenRepository,
            handlerExceptionResolver
    );

    @BeforeEach
    void setUp() {
        Mockito.when(tokenRepository.isBlacklisted(Mockito.anyString())).thenReturn(false);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("유효한 Bearer Access Token이면 DB 조회 없이 claims로 인증 정보를 구성한다")
    void authenticatesAccessTokenFromClaims() throws Exception {
        String accessToken = jwtProvider.createAccessToken(1L, "USER");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + accessToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = Mockito.mock(FilterChain.class);

        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertThat(authentication).isNotNull();
        assertThat(authentication.getPrincipal()).isEqualTo(1L);
        assertThat(authentication.getAuthorities())
                .extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_USER");
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("블랙리스트에 등록된 Access Token은 TOKEN_INVALID로 거부한다")
    void rejectsBlacklistedAccessToken() throws Exception {
        String accessToken = jwtProvider.createAccessToken(1L, "USER");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + accessToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = Mockito.mock(FilterChain.class);

        when(tokenRepository.isBlacklisted(any())).thenReturn(true);

        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        ArgumentCaptor<CustomException> exceptionCaptor = ArgumentCaptor.forClass(CustomException.class);
        verify(handlerExceptionResolver).resolveException(
                eq(request),
                eq(response),
                isNull(),
                exceptionCaptor.capture()
        );
        assertThat(exceptionCaptor.getValue().getErrorCode()).isEqualTo(ErrorCode.TOKEN_INVALID);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("Bearer 헤더에 Refresh Token을 사용하면 TOKEN_INVALID로 거부한다")
    void rejectsRefreshTokenInAuthorizationHeader() throws Exception {
        String refreshToken = jwtProvider.createRefreshToken(1L, "USER");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + refreshToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = Mockito.mock(FilterChain.class);

        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        ArgumentCaptor<CustomException> exceptionCaptor = ArgumentCaptor.forClass(CustomException.class);
        verify(handlerExceptionResolver).resolveException(
                eq(request),
                eq(response),
                isNull(),
                exceptionCaptor.capture()
        );
        assertThat(exceptionCaptor.getValue().getErrorCode()).isEqualTo(ErrorCode.TOKEN_INVALID);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("만료된 Access Token은 TOKEN_EXPIRED로 매핑한다")
    void mapsExpiredAccessTokenToTokenExpired() throws Exception {
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

        filter.doFilter(request, response, filterChain);

        ArgumentCaptor<CustomException> exceptionCaptor = ArgumentCaptor.forClass(CustomException.class);
        verify(handlerExceptionResolver).resolveException(
                eq(request),
                eq(response),
                isNull(),
                exceptionCaptor.capture()
        );
        assertThat(exceptionCaptor.getValue().getErrorCode()).isEqualTo(ErrorCode.TOKEN_EXPIRED);
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("토큰 재발급 경로는 Access Token 필터링을 건너뛴다")
    void skipsAccessTokenFilteringForReissuePath() throws Exception {
        String accessToken = jwtProvider.createAccessToken(1L, "USER");
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/auth/reissue");
        request.setServletPath("/auth/reissue");
        request.addHeader("Authorization", "Bearer " + accessToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = Mockito.mock(FilterChain.class);

        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("로그인 경로는 만료된 토큰이 있어도 필터링 없이 통과시킨다")
    void skipsFilteringForLoginPathEvenWithExpiredToken() throws Exception {
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

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(handlerExceptionResolver, never()).resolveException(any(), any(), any(), any());
    }

    @Test
    @DisplayName("회원가입 경로는 무효한 토큰이 있어도 필터링 없이 통과시킨다")
    void skipsFilteringForSignupPathEvenWithInvalidToken() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/auth/signup");
        request.setServletPath("/auth/signup");
        request.addHeader("Authorization", "Bearer invalid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = Mockito.mock(FilterChain.class);

        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(handlerExceptionResolver, never()).resolveException(any(), any(), any(), any());
    }

    private JwtProperties jwtProperties(long accessTokenExpirationMillis, long refreshTokenExpirationMillis) {
        return new JwtProperties(
                "test-only-jwt-secret-key-please-change-me-1234567890",
                accessTokenExpirationMillis,
                refreshTokenExpirationMillis
        );
    }
}
