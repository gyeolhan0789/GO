package com.wecandoit.common.jwt;

import static com.wecandoit.common.exception.ErrorCode.REFRESH_TOKEN_INVALID;

import com.wecandoit.common.exception.CustomException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.Arrays;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RefreshTokenCookieManager {

    public static final String REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
    public static final String REFRESH_TOKEN_COOKIE_PATH = "/auth/reissue";

    private final JwtProperties jwtProperties;

    public void setCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = createRefreshTokenCookie(
                refreshToken,
                jwtProperties.refreshTokenExpirationMillis()
        );
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public void deleteCookie(HttpServletResponse response) {
        ResponseCookie cookie = createRefreshTokenCookie("", 0L);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private ResponseCookie createRefreshTokenCookie(String refreshToken, long maxAgeMillis) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path(REFRESH_TOKEN_COOKIE_PATH)
                .maxAge(Duration.ofMillis(maxAgeMillis))
                .build();
    }

    public String getRefreshToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null || cookies.length == 0) {
            throw new CustomException(REFRESH_TOKEN_INVALID);
        }

        Cookie refreshTokenCookie = Arrays.stream(cookies)
                .filter(cookie -> REFRESH_TOKEN_COOKIE_NAME.equals(cookie.getName()))
                .findFirst()
                .orElseThrow(() -> new CustomException(REFRESH_TOKEN_INVALID));

        String refreshToken = refreshTokenCookie.getValue();
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new CustomException(REFRESH_TOKEN_INVALID);
        }
        return refreshToken;
    }
}
