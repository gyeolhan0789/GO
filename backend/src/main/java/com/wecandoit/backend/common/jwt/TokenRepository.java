package com.wecandoit.backend.common.jwt;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class TokenRepository {

    private static final String REFRESH_TOKEN_KEY_PREFIX = "refresh-token:";
    private static final String BLACKLIST_KEY_PREFIX = "blacklist:";
    private static final String BLACKLISTED_VALUE = "true";

    private final StringRedisTemplate redisTemplate;

    public void saveRefreshToken(Long memberId, String refreshToken, long ttlMillis) {
        redisTemplate.opsForValue().set(refreshTokenKey(memberId), refreshToken, Duration.ofMillis(ttlMillis));
    }

    public Optional<String> findRefreshToken(Long memberId) {
        return Optional.ofNullable(redisTemplate.opsForValue().get(refreshTokenKey(memberId)));
    }

    public void deleteRefreshToken(Long memberId) {
        redisTemplate.delete(refreshTokenKey(memberId));
    }

    public void blacklistAccessToken(JwtClaims claims) {
        Duration ttl = Duration.between(Instant.now(), claims.expiration());
        if (ttl.isNegative() || ttl.isZero()) {
            return;
        }
        redisTemplate.opsForValue().set(blacklistKey(claims.jwtId()), BLACKLISTED_VALUE, ttl);
    }

    public boolean isBlacklisted(String jwtId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(blacklistKey(jwtId)));
    }

    private String refreshTokenKey(Long memberId) {
        return REFRESH_TOKEN_KEY_PREFIX + memberId;
    }

    private String blacklistKey(String jwtId) {
        return BLACKLIST_KEY_PREFIX + jwtId;
    }
}
