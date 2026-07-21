package com.wecandoit.common.jwt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

@DisplayName("Refresh Token 쿠키 매니저")
class RefreshTokenCookieManagerTest {

    private final RefreshTokenCookieManager refreshTokenCookieManager =
            new RefreshTokenCookieManager(jwtProperties(1_000L));

    @Test
    @DisplayName("Refresh Token 쿠키는 재발급 경로에만 설정된다")
    void setCookieLimitsCookieToReissuePath() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        refreshTokenCookieManager.setCookie(response, "refresh-token");

        assertThat(response.getHeader("Set-Cookie"))
                .contains("HttpOnly")
                .contains("Secure")
                .contains("SameSite=Strict")
                .contains("Path=/auth/reissue")
                .contains("Max-Age=1");
    }

    @Test
    @DisplayName("Refresh Token 쿠키 삭제는 동일한 경로를 사용한다")
    void deleteCookieUsesSamePath() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        refreshTokenCookieManager.deleteCookie(response);

        assertThat(response.getHeader("Set-Cookie"))
                .contains("Max-Age=0")
                .contains("Path=/auth/reissue");
    }

    @Test
    @DisplayName("Refresh Token 쿠키 값을 조회한다")
    void getRefreshTokenReturnsMatchingCookieValue() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("other", "value"), new Cookie("refreshToken", "refresh-token"));

        String refreshToken = refreshTokenCookieManager.getRefreshToken(request);

        assertThat(refreshToken).isEqualTo("refresh-token");
    }

    @Test
    @DisplayName("Refresh Token 쿠키가 없으면 예외가 발생한다")
    void getRefreshTokenRejectsMissingCookie() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        assertThatThrownBy(() -> refreshTokenCookieManager.getRefreshToken(request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.REFRESH_TOKEN_INVALID);
    }

    @Test
    @DisplayName("Refresh Token 쿠키 값이 비어 있으면 예외가 발생한다")
    void getRefreshTokenRejectsBlankCookie() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("refreshToken", " "));

        assertThatThrownBy(() -> refreshTokenCookieManager.getRefreshToken(request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.REFRESH_TOKEN_INVALID);
    }

    private JwtProperties jwtProperties(long refreshTokenExpirationMillis) {
        return new JwtProperties(
                "test-only-jwt-secret-key-please-change-me-1234567890",
                1_800_000L,
                refreshTokenExpirationMillis
        );
    }
}
