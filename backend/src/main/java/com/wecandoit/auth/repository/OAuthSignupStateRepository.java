package com.wecandoit.auth.repository;

import com.wecandoit.auth.dto.OAuthSignupState;
import com.wecandoit.member.domain.AuthProvider;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class OAuthSignupStateRepository {

    private static final String STATE_KEY_PREFIX = "oauth-signup-state:";
    private static final String ACTIVE_TOKEN_KEY_PREFIX = "oauth-signup-active:";
    // Unit Separator(0x1F)를 구분자로 사용해 닉네임에 포함될 수 있는 일반 기호(예: "|")와 충돌하지 않게 한다.
    private static final String FIELD_DELIMITER = Character.toString(0x1F);
    private static final Duration TTL = Duration.ofMinutes(5);

    private final StringRedisTemplate redisTemplate;

    public String save(String email, AuthProvider provider, String nickname) {
        String activeTokenKey = activeTokenKey(provider, email);
        String previousToken = redisTemplate.opsForValue().get(activeTokenKey);
        if (previousToken != null) {
            redisTemplate.delete(stateKey(previousToken));
        }

        String signupToken = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(stateKey(signupToken), serialize(email, provider, nickname), TTL);
        redisTemplate.opsForValue().set(activeTokenKey, signupToken, TTL);
        return signupToken;
    }

    public Optional<OAuthSignupState> find(String signupToken) {
        return Optional.ofNullable(redisTemplate.opsForValue().get(stateKey(signupToken)))
                .map(this::deserialize);
    }

    public void delete(String signupToken) {
        redisTemplate.delete(stateKey(signupToken));
    }

    private String stateKey(String signupToken) {
        return STATE_KEY_PREFIX + signupToken;
    }

    private String activeTokenKey(AuthProvider provider, String email) {
        return ACTIVE_TOKEN_KEY_PREFIX + provider + ":" + email;
    }

    private String serialize(String email, AuthProvider provider, String nickname) {
        return provider + FIELD_DELIMITER + email + FIELD_DELIMITER + nickname;
    }

    private OAuthSignupState deserialize(String value) {
        String[] parts = value.split(FIELD_DELIMITER, 3);
        return new OAuthSignupState(parts[1], AuthProvider.valueOf(parts[0]), parts[2]);
    }
}
