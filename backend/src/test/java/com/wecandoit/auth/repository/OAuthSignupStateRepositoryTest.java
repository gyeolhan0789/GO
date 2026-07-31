package com.wecandoit.auth.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.wecandoit.auth.dto.OAuthSignupState;
import com.wecandoit.member.domain.AuthProvider;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@DisplayName("소셜 회원가입 임시 상태 저장소")
@ExtendWith(MockitoExtension.class)
class OAuthSignupStateRepositoryTest {

    private static final String DELIMITER = Character.toString(0x1F);

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;
    private OAuthSignupStateRepository repository;

    @BeforeEach
    void setUp() {
        repository = new OAuthSignupStateRepository(redisTemplate);
    }

    @Test
    @DisplayName("최초 저장 시 이전 토큰 삭제 없이 새 signup 토큰을 발급한다")
    void saveIssuesNewTokenWhenNoPreviousTokenExists() {
        // given
        given(redisTemplate.opsForValue()).willReturn(valueOperations);
        given(valueOperations.get("oauth-signup-active:GOOGLE:new@gmail.com")).willReturn(null);

        // when
        String signupToken = repository.save("new@gmail.com", AuthProvider.GOOGLE, "신규유저");

        // then
        assertThat(signupToken).isNotBlank();
        String expectedSerialized = "GOOGLE" + DELIMITER + "new@gmail.com" + DELIMITER + "신규유저";
        then(valueOperations).should().set(
                eq("oauth-signup-state:" + signupToken), eq(expectedSerialized), eq(Duration.ofMinutes(5)));
        then(valueOperations).should().set(
                eq("oauth-signup-active:GOOGLE:new@gmail.com"), eq(signupToken), eq(Duration.ofMinutes(5)));
        then(redisTemplate).should(never()).delete(any(String.class));
    }

    @Test
    @DisplayName("동일 email+provider로 재요청하면 이전 signup 토큰을 대체한다")
    void saveReplacesPreviousTokenForSameEmailAndProvider() {
        // given
        given(redisTemplate.opsForValue()).willReturn(valueOperations);
        given(valueOperations.get("oauth-signup-active:GOOGLE:new@gmail.com")).willReturn("old-token");

        // when
        String signupToken = repository.save("new@gmail.com", AuthProvider.GOOGLE, "신규유저");

        // then
        then(redisTemplate).should().delete("oauth-signup-state:old-token");
        then(valueOperations).should().set(
                eq("oauth-signup-state:" + signupToken), any(String.class), eq(Duration.ofMinutes(5)));
    }

    @Test
    @DisplayName("저장된 signup 토큰으로 email/provider/nickname을 조회한다")
    void findReturnsStoredState() {
        // given
        given(redisTemplate.opsForValue()).willReturn(valueOperations);
        given(valueOperations.get("oauth-signup-state:signup-token-1"))
                .willReturn("GOOGLE" + DELIMITER + "new@gmail.com" + DELIMITER + "신규유저");

        // when
        Optional<OAuthSignupState> state = repository.find("signup-token-1");

        // then
        assertThat(state).contains(new OAuthSignupState("new@gmail.com", AuthProvider.GOOGLE, "신규유저"));
    }

    @Test
    @DisplayName("존재하지 않는 signup 토큰은 빈 값을 반환한다")
    void findReturnsEmptyForMissingToken() {
        // given
        given(redisTemplate.opsForValue()).willReturn(valueOperations);
        given(valueOperations.get("oauth-signup-state:missing-token")).willReturn(null);

        // when
        Optional<OAuthSignupState> state = repository.find("missing-token");

        // then
        assertThat(state).isEmpty();
    }

    @Test
    @DisplayName("signup 토큰을 삭제하면 상태 키가 제거된다")
    void deleteRemovesStateKey() {
        // when
        repository.delete("signup-token-1");

        // then
        then(redisTemplate).should().delete("oauth-signup-state:signup-token-1");
    }
}
