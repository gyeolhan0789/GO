package com.wecandoit.common.jwt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@DisplayName("토큰 저장소")
@ExtendWith(MockitoExtension.class)
class TokenRepositoryTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;
    private TokenRepository tokenRepository;

    @BeforeEach
    void setUp() {
        tokenRepository = new TokenRepository(redisTemplate);
    }

    @Test
    @DisplayName("Refresh Token 저장 시 회원 ID에 네임스페이스를 붙인다")
    void saveRefreshTokenUsesNamespacedMemberKey() {
        // given
        given(redisTemplate.opsForValue()).willReturn(valueOperations);

        // when
        tokenRepository.saveRefreshToken(1L, "refresh-token", 1_000L);

        // then
        then(valueOperations).should().set("refresh-token:1", "refresh-token", Duration.ofMillis(1_000L));
    }

    @Test
    @DisplayName("Refresh Token 조회 시 회원 ID에 네임스페이스를 붙인다")
    void findRefreshTokenUsesNamespacedMemberKey() {
        // given
        given(redisTemplate.opsForValue()).willReturn(valueOperations);

        // when
        tokenRepository.findRefreshToken(1L);

        // then
        then(redisTemplate).should().opsForValue();
        then(valueOperations).should().get("refresh-token:1");
    }

    @Test
    @DisplayName("Refresh Token 삭제 시 회원 ID에 네임스페이스를 붙인다")
    void deleteRefreshTokenUsesNamespacedMemberKey() {
        // when
        tokenRepository.deleteRefreshToken(1L);

        // then
        then(redisTemplate).should().delete("refresh-token:1");
    }

    @Test
    @DisplayName("Access Token 블랙리스트 등록 시 남은 만료 시간만큼 TTL을 둔다")
    void blacklistAccessTokenUsesRemainingExpirationAsTtl() {
        // given
        given(redisTemplate.opsForValue()).willReturn(valueOperations);
        JwtClaims claims = new JwtClaims(
                1L, "USER", TokenType.ACCESS, "jwt-id", Instant.now().plusSeconds(60));

        // when
        tokenRepository.blacklistAccessToken(claims);

        // then
        then(valueOperations).should().set(
                org.mockito.ArgumentMatchers.eq("blacklist:jwt-id"),
                any(String.class),
                org.mockito.ArgumentMatchers.argThat((Duration ttl) ->
                        ttl.toSeconds() > 0 && ttl.toSeconds() <= 60));
    }

    @Test
    @DisplayName("이미 만료된 토큰은 블랙리스트에 등록하지 않는다")
    void blacklistAccessTokenSkipsAlreadyExpiredToken() {
        // given
        JwtClaims claims = new JwtClaims(
                1L, "USER", TokenType.ACCESS, "jwt-id", Instant.now().minusSeconds(1));

        // when
        tokenRepository.blacklistAccessToken(claims);

        // then
        then(redisTemplate).should(never()).opsForValue();
    }

    @Test
    @DisplayName("블랙리스트에 등록된 jti는 조회 시 true를 반환한다")
    void isBlacklistedReturnsTrueForListedJti() {
        // given
        given(redisTemplate.hasKey("blacklist:jwt-id")).willReturn(true);

        // when & then
        assertThat(tokenRepository.isBlacklisted("jwt-id")).isTrue();
    }

    @Test
    @DisplayName("블랙리스트에 없는 jti는 조회 시 false를 반환한다")
    void isBlacklistedReturnsFalseForUnlistedJti() {
        // given
        given(redisTemplate.hasKey("blacklist:jwt-id")).willReturn(false);

        // when & then
        assertThat(tokenRepository.isBlacklisted("jwt-id")).isFalse();
    }
}
