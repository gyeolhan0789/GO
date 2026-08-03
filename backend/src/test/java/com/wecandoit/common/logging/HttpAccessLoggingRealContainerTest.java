package com.wecandoit.common.logging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import com.wecandoit.common.jwt.JwtProvider;
import com.wecandoit.common.jwt.TokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

// AC-X15: 미처리 예외가 실제 임베디드 컨테이너에서 클라이언트에게 500으로 전달되는지 확인한다.
// MockMvc의 TestDispatcherServlet은 Tomcat의 StandardHostValve 에러 페이지 전달을 흉내 내지
// 않아(예외가 mockMvc.perform() 밖으로 그대로 던져진다), 이 검증만큼은 실제 서버가 도는
// RANDOM_PORT + TestRestTemplate가 필요하다.
//
// 이 테스트가 원래 잡아낸 버그: 인증된 요청이 미처리 예외를 던지면 Boot의 내부 /error 포워드가
// springSecurityFilterChain을 ERROR 디스패치에서 다시 태우는데, stateless(JWT) 인증이 그
// 두 번째 통과에서 이어지지 않아 클라이언트가 500 대신 401을 받았다. JwtAuthenticationFilter의
// PERMIT_ALL_PATHS에 "/error"를 추가해 그 두 번째 통과 자체를 인증 없이 통과시키는 것으로
// 고쳤다 — 상세 메시지/스택트레이스를 노출하지 않는 한 /error는 인증이 필요 없는 경로다.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(HttpAccessLoggingIntegrationTest.LoggingTestConfig.class)
class HttpAccessLoggingRealContainerTest {

    private static final long TEST_MEMBER_ID = 1L;
    private static final String TEST_ROLE = "USER";

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JwtProvider jwtProvider;

    @MockitoBean
    private TokenRepository tokenRepository;

    @BeforeEach
    void setUp() {
        given(tokenRepository.isBlacklisted(anyString())).willReturn(false);
    }

    @Test
    @DisplayName("실제 임베디드 컨테이너에서 미처리 예외는 클라이언트에게 500으로 전달된다")
    void deliversStandard500BodyThroughRealContainer() {
        // given
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtProvider.createAccessToken(TEST_MEMBER_ID, TEST_ROLE));

        // when
        ResponseEntity<String> response = restTemplate.exchange(
                "/test/logging/boom", HttpMethod.GET, new HttpEntity<>(headers), String.class);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotBlank();
    }

    @Test
    @DisplayName("인증 없이 보호된 API를 호출하면 여전히 401이다 (/error permitAll이 다른 경로에 새지 않는다)")
    void protectedApiStillRequiresAuthentication() {
        // when
        ResponseEntity<String> response =
                restTemplate.getForEntity("/test/logging/ok", String.class);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
