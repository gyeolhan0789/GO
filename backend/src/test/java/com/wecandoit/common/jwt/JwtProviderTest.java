package com.wecandoit.common.jwt;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("JWT 발급 및 검증")
class JwtProviderTest {

    private final JwtProvider jwtProvider = new JwtProvider(
            jwtProperties(1_800_000L, 1_209_600_000L)
    );

    @Test
    @DisplayName("Access Token에는 ACCESS 타입이 포함되고 Refresh Token 검증은 실패한다")
    void createAccessTokenIncludesAccessTokenType() {
        // when
        String accessToken = jwtProvider.createAccessToken(1L, "USER");
        TokenValidationResult.Valid valid =
                (TokenValidationResult.Valid) jwtProvider.validateAccessToken(accessToken);
        JwtClaims claims = valid.claims();

        // then
        assertThat(claims.memberId()).isEqualTo(1L);
        assertThat(claims.role()).isEqualTo("USER");
        assertThat(claims.tokenType()).isEqualTo(TokenType.ACCESS);
        assertThat(claims.expiration()).isAfter(Instant.now());
        assertThat(jwtProvider.validateRefreshToken(accessToken))
                .isEqualTo(new TokenValidationResult.Invalid(
                        TokenValidationResult.InvalidReason.WRONG_TOKEN_TYPE));
    }

    @Test
    @DisplayName("Refresh Token에는 REFRESH 타입이 포함되고 Access Token 검증은 실패한다")
    void createRefreshTokenIncludesRefreshTokenType() {
        // when
        String refreshToken = jwtProvider.createRefreshToken(1L, "USER");
        TokenValidationResult.Valid valid =
                (TokenValidationResult.Valid) jwtProvider.validateRefreshToken(refreshToken);
        JwtClaims claims = valid.claims();

        // then
        assertThat(claims.tokenType()).isEqualTo(TokenType.REFRESH);
        assertThat(jwtProvider.validateAccessToken(refreshToken))
                .isEqualTo(new TokenValidationResult.Invalid(
                        TokenValidationResult.InvalidReason.WRONG_TOKEN_TYPE));
    }

    @Test
    @DisplayName("새로 발급한 JWT는 고유한 jti를 가진다")
    void createdTokensHaveUniqueJwtIds() {
        // when
        String firstToken = jwtProvider.createRefreshToken(1L, "USER");
        String secondToken = jwtProvider.createRefreshToken(1L, "USER");

        TokenValidationResult.Valid firstValidation =
                (TokenValidationResult.Valid) jwtProvider.validateRefreshToken(firstToken);
        TokenValidationResult.Valid secondValidation =
                (TokenValidationResult.Valid) jwtProvider.validateRefreshToken(secondToken);

        // then
        assertThat(firstValidation.claims().jwtId())
                .isNotEqualTo(secondValidation.claims().jwtId());
    }

    @Test
    @DisplayName("만료된 Access Token은 유효하지 않다")
    void expiredAccessTokenDoesNotValidate() {
        // given
        JwtProvider expiringProvider = new JwtProvider(
                jwtProperties(-1L, 1_209_600_000L)
        );

        // when
        String accessToken = expiringProvider.createAccessToken(1L, "USER");

        // then
        assertThat(expiringProvider.validateAccessToken(accessToken))
                .isEqualTo(new TokenValidationResult.Invalid(TokenValidationResult.InvalidReason.EXPIRED));
    }

    private JwtProperties jwtProperties(long accessTokenExpirationMillis, long refreshTokenExpirationMillis) {
        return new JwtProperties(
                "test-only-jwt-secret-key-please-change-me-1234567890",
                accessTokenExpirationMillis,
                refreshTokenExpirationMillis
        );
    }
}
