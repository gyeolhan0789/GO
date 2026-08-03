package com.wecandoit.common.logging;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SensitiveDataMaskerTest {

    @Test
    @DisplayName("password 값을 마스킹한다")
    void masksPassword() {
        // given
        String body = "{\"email\":\"user@example.com\",\"password\":\"secret1234\"}";

        // when
        String masked = SensitiveDataMasker.maskBody(body);

        // then
        assertThat(masked).doesNotContain("secret1234").contains("\"password\":\"***\"");
    }

    @Test
    @DisplayName("accessToken과 refreshToken 값을 마스킹한다")
    void masksTokens() {
        // given
        String body = "{\"accessToken\":\"aaa.bbb.ccc\",\"refreshToken\":\"ddd.eee.fff\"}";

        // when
        String masked = SensitiveDataMasker.maskBody(body);

        // then
        assertThat(masked).doesNotContain("aaa.bbb.ccc").doesNotContain("ddd.eee.fff");
    }

    @Test
    @DisplayName("PasswordChangeRequest의 currentPassword와 newPassword를 마스킹한다")
    void masksPasswordChangeRequestFields() {
        // given: PATCH /members/password 요청 본문. 현재 비밀번호가 틀리면 401이 나고 본문이 로깅된다
        String body = "{\"currentPassword\":\"Hunter2!!\",\"newPassword\":\"NewHunter3!!\"}";

        // when
        String masked = SensitiveDataMasker.maskBody(body);

        // then
        assertThat(masked).doesNotContain("Hunter2!!").doesNotContain("NewHunter3!!");
    }

    @Test
    @DisplayName("OAuthTokenRequest의 idToken을 마스킹한다")
    void masksOAuthIdToken() {
        // given: OAuth 실패는 모두 4xx/5xx라 본문이 로깅된다. idToken은 살아 있는 bearer 자격증명이다
        String body = "{\"idToken\":\"eyJhbGciOi.payload.sig\",\"gender\":\"MALE\"}";

        // when
        String masked = SensitiveDataMasker.maskBody(body);

        // then
        assertThat(masked).doesNotContain("eyJhbGciOi.payload.sig").contains("MALE");
    }

    @Test
    @DisplayName("중첩된 JSON 안의 secret 값도 마스킹한다")
    void masksNestedSecret() {
        // given
        String body = "{\"outer\":{\"secret\":\"hidden-value\"}}";

        // when
        String masked = SensitiveDataMasker.maskBody(body);

        // then
        assertThat(masked).doesNotContain("hidden-value");
    }

    @Test
    @DisplayName("값에 이스케이프된 따옴표가 있어도 전체를 마스킹한다")
    void masksValueContainingEscapedQuote() {
        // given
        String body = "{\"password\":\"pa\\\"ss\",\"email\":\"user@example.com\"}";

        // when
        String masked = SensitiveDataMasker.maskBody(body);

        // then
        assertThat(masked).doesNotContain("pa\\\"ss").contains("user@example.com");
    }

    @Test
    @DisplayName("민감 필드가 없으면 본문을 그대로 반환한다")
    void keepsBodyWithoutSensitiveFields() {
        // given
        String body = "{\"nickname\":\"wecandoit\"}";

        // when
        String masked = SensitiveDataMasker.maskBody(body);

        // then
        assertThat(masked).isEqualTo(body);
    }

    @Test
    @DisplayName("본문이 null이면 null을 반환한다")
    void returnsNullForNullBody() {
        // given & when
        String masked = SensitiveDataMasker.maskBody(null);

        // then
        assertThat(masked).isNull();
    }

    @Test
    @DisplayName("Authorization 헤더 값을 마스킹한다")
    void masksAuthorizationHeader() {
        // given & when
        String masked = SensitiveDataMasker.maskHeaderValue("Authorization", "Bearer aaa.bbb.ccc");

        // then
        assertThat(masked).doesNotContain("aaa.bbb.ccc");
    }

    @Test
    @DisplayName("헤더 이름 대소문자에 관계없이 마스킹한다")
    void masksHeaderIgnoringCase() {
        // given & when
        String masked = SensitiveDataMasker.maskHeaderValue("COOKIE", "session=abcdef");

        // then
        assertThat(masked).doesNotContain("session=abcdef");
    }

    @Test
    @DisplayName("민감하지 않은 헤더 값은 그대로 반환한다")
    void keepsNonSensitiveHeader() {
        // given & when
        String masked = SensitiveDataMasker.maskHeaderValue("Content-Type", "application/json");

        // then
        assertThat(masked).isEqualTo("application/json");
    }

    @Test
    @DisplayName("SQL 컬럼명처럼 순수 식별자도 이름에 토큰이 포함되면 민감하다고 판정한다")
    void isSensitiveNameMatchesBareIdentifiers() {
        // given & when & then: QueryLoggingListener가 SQL 컬럼명 마스킹에 이 판정을 그대로 재사용한다
        assertThat(SensitiveDataMasker.isSensitiveName("password")).isTrue();
        assertThat(SensitiveDataMasker.isSensitiveName("fcm_token")).isTrue();
        assertThat(SensitiveDataMasker.isSensitiveName("nickname")).isFalse();
    }
}
