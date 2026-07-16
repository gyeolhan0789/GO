package com.wecandoit.backend.common.jwt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@DisplayName("토큰 저장소")
class TokenRepositoryTest {

    private final StringRedisTemplate redisTemplate = Mockito.mock(StringRedisTemplate.class);
    private final ValueOperations<String, String> valueOperations = Mockito.mock(ValueOperations.class);
    private final TokenRepository tokenRepository = new TokenRepository(redisTemplate);

    @Test
    @DisplayName("Refresh Token 저장 시 회원 ID에 네임스페이스를 붙인다")
    void saveRefreshTokenUsesNamespacedMemberKey() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        tokenRepository.saveRefreshToken(1L, "refresh-token", 1_000L);

        verify(valueOperations).set("refresh-token:1", "refresh-token", Duration.ofMillis(1_000L));
    }

    @Test
    @DisplayName("Refresh Token 조회 시 회원 ID에 네임스페이스를 붙인다")
    void findRefreshTokenUsesNamespacedMemberKey() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        tokenRepository.findRefreshToken(1L);

        verify(redisTemplate).opsForValue();
        verify(valueOperations).get("refresh-token:1");
    }

    @Test
    @DisplayName("Refresh Token 삭제 시 회원 ID에 네임스페이스를 붙인다")
    void deleteRefreshTokenUsesNamespacedMemberKey() {
        tokenRepository.deleteRefreshToken(1L);

        verify(redisTemplate).delete("refresh-token:1");
    }

    @Test
    @DisplayName("Access Token 블랙리스트 등록 시 남은 만료 시간만큼 TTL을 둔다")
    void blacklistAccessTokenUsesRemainingExpirationAsTtl() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        JwtClaims claims = new JwtClaims(
                1L, "USER", TokenType.ACCESS, "jwt-id", Instant.now().plusSeconds(60));

        tokenRepository.blacklistAccessToken(claims);

        verify(valueOperations).set(
                org.mockito.ArgumentMatchers.eq("blacklist:jwt-id"),
                any(String.class),
                org.mockito.ArgumentMatchers.argThat((Duration ttl) ->
                        ttl.toSeconds() > 0 && ttl.toSeconds() <= 60));
    }

    @Test
    @DisplayName("이미 만료된 토큰은 블랙리스트에 등록하지 않는다")
    void blacklistAccessTokenSkipsAlreadyExpiredToken() {
        JwtClaims claims = new JwtClaims(
                1L, "USER", TokenType.ACCESS, "jwt-id", Instant.now().minusSeconds(1));

        tokenRepository.blacklistAccessToken(claims);

        verify(redisTemplate, never()).opsForValue();
    }

    @Test
    @DisplayName("블랙리스트에 등록된 jti는 조회 시 true를 반환한다")
    void isBlacklistedReturnsTrueForListedJti() {
        when(redisTemplate.hasKey("blacklist:jwt-id")).thenReturn(true);

        assertThat(tokenRepository.isBlacklisted("jwt-id")).isTrue();
    }

    @Test
    @DisplayName("블랙리스트에 없는 jti는 조회 시 false를 반환한다")
    void isBlacklistedReturnsFalseForUnlistedJti() {
        when(redisTemplate.hasKey("blacklist:jwt-id")).thenReturn(false);

        assertThat(tokenRepository.isBlacklisted("jwt-id")).isFalse();
    }
}
