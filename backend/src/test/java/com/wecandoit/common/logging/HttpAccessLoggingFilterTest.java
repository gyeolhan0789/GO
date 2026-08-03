package com.wecandoit.common.logging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.util.Enumeration;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerMapping;

class HttpAccessLoggingFilterTest {

    private static final int MAX_BODY_LENGTH = 2000;

    private ListAppender<ILoggingEvent> appender;
    private Logger filterLogger;
    private HttpAccessLoggingFilter filter;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        MDC.clear();
        filterLogger = (Logger) LoggerFactory.getLogger(HttpAccessLoggingFilter.class);
        appender = new ListAppender<>();
        appender.start();
        filterLogger.addAppender(appender);
        filter = newFilter(true);
        response = new MockHttpServletResponse();
    }

    @AfterEach
    void tearDown() {
        filterLogger.detachAppender(appender);
        MDC.clear();
    }

    @Test
    @DisplayName("2xx 응답에는 요청·응답 본문을 남기지 않는다")
    void doesNotLogBodiesForSuccess() throws Exception {
        // given
        MockHttpServletRequest request = jsonRequest("{\"nickname\":\"wecandoit\"}");

        // when
        filter.doFilter(request, response, respondWith(200, "{\"id\":1}"));

        // then
        assertThat(loggedMessage()).doesNotContain("req=").doesNotContain("resp=");
    }

    @Test
    @DisplayName("2xx 응답에 method·uri·status·소요시간을 남긴다")
    void logsAccessLineForSuccess() throws Exception {
        // given
        MockHttpServletRequest request = jsonRequest("{}");
        request.setRequestURI("/api/friends");
        request.setMethod("GET");

        // when
        filter.doFilter(request, response, respondWith(200, "[]"));

        // then
        assertThat(loggedMessage()).contains("GET").contains("/api/friends").contains("200").contains("ms");
    }

    @Test
    @DisplayName("4xx 응답에는 응답 본문을 남긴다")
    void logsResponseBodyForClientError() throws Exception {
        // given
        MockHttpServletRequest request = jsonRequest("{}");

        // when
        filter.doFilter(request, response, respondWith(400, "{\"status\":400,\"message\":\"잘못된 요청\"}"));

        // then
        assertThat(loggedMessage()).contains("resp=").contains("잘못된 요청");
    }

    @Test
    @DisplayName("4xx 응답 로그에 password 원문이 남지 않는다")
    void masksPasswordInErrorLog() throws Exception {
        // given
        MockHttpServletRequest request = jsonRequest("{\"email\":\"a@b.com\",\"password\":\"secret1234\"}");

        // when
        filter.doFilter(request, response, respondWith(401, "{\"status\":401}"));

        // then
        assertThat(loggedMessage()).doesNotContain("secret1234").contains("\"password\":\"***\"");
    }

    @Test
    @DisplayName("4xx 응답 로그에 Authorization 헤더 원문이 남지 않는다")
    void masksAuthorizationHeaderInErrorLog() throws Exception {
        // given
        MockHttpServletRequest request = jsonRequest("{}");
        request.addHeader("Authorization", "Bearer aaa.bbb.ccc");

        // when
        filter.doFilter(request, response, respondWith(401, "{\"status\":401}"));

        // then
        assertThat(loggedMessage()).doesNotContain("aaa.bbb.ccc");
    }

    @Test
    @DisplayName("multipart 요청은 본문을 남기지 않는다")
    void doesNotLogMultipartBody() throws Exception {
        // given
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setContentType("multipart/form-data; boundary=----abc");
        request.setContent("----abc\r\nbinary-image-bytes\r\n----abc--".getBytes(StandardCharsets.UTF_8));

        // when
        filter.doFilter(request, response, respondWith(400, "{\"status\":400}"));

        // then
        assertThat(loggedMessage()).doesNotContain("binary-image-bytes");
    }

    @Test
    @DisplayName("상한을 넘는 요청 본문은 상한까지만 남기고 절단 마커를 붙인다")
    void limitsAndMarksTruncatedRequestBody() throws Exception {
        // given: 문자당 1바이트인 본문은 디코딩된 길이가 그대로 상한과 같아져
        // 문자 길이 비교만으로는 절단 여부를 알 수 없다 — Content-Length와 비교해야 한다
        String hugeBody = "{\"note\":\"" + "a".repeat(3000) + "\"}";
        MockHttpServletRequest request = jsonRequest(hugeBody);

        // when
        filter.doFilter(request, response, respondWith(400, "{\"status\":400}"));

        // then: 상한을 넘지 않으면서도, 크기 때문에 아예 미기록되는 것이 아님을 함께 단언한다
        assertThat(loggedMessage())
                .doesNotContain("a".repeat(MAX_BODY_LENGTH + 1))
                .contains("a".repeat(MAX_BODY_LENGTH - 100))
                .contains("...(truncated)");
    }

    @Test
    @DisplayName("상한 이하의 요청 본문에는 절단 마커가 붙지 않는다")
    void doesNotMarkShortRequestBodyAsTruncated() throws Exception {
        // given
        MockHttpServletRequest request = jsonRequest("{\"note\":\"short\"}");

        // when
        filter.doFilter(request, response, respondWith(400, "{\"status\":400}"));

        // then
        assertThat(loggedMessage()).doesNotContain("...(truncated)");
    }

    @Test
    @DisplayName("상한을 넘는 응답 본문은 상한 길이로 절단해 남긴다")
    void truncatesOversizedResponseBody() throws Exception {
        // given: 응답은 byte 상한 없이 전량 캐시되므로 문자 길이 기준으로 절단해야 한다
        MockHttpServletRequest request = jsonRequest("{}");
        String hugeResponseBody = "{\"note\":\"" + "a".repeat(3000) + "\"}";

        // when
        filter.doFilter(request, response, respondWith(400, hugeResponseBody));

        // then
        assertThat(loggedMessage())
                .contains("...(truncated)")
                .doesNotContain("a".repeat(MAX_BODY_LENGTH + 1));
    }

    @Test
    @DisplayName("상한 이하의 응답 본문에는 절단 마커가 붙지 않는다")
    void doesNotTruncateShortResponseBody() throws Exception {
        // given
        MockHttpServletRequest request = jsonRequest("{}");

        // when
        filter.doFilter(request, response, respondWith(400, "{\"status\":400}"));

        // then
        assertThat(loggedMessage()).doesNotContain("...(truncated)");
    }

    @Test
    @DisplayName("정적 자원 경로는 응답을 감싸지 않아 본문을 남기지 않는다")
    void doesNotWrapStaticResourceResponse() throws Exception {
        // given: ContentCachingResponseWrapper에는 상한이 없어 5MB 이미지가 전량 힙에 적재된다
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/uploads/profile/17.png");

        // when
        filter.doFilter(request, response, respondWith(404, "{\"status\":404}"));

        // then
        assertThat(loggedMessage()).contains("resp=").doesNotContain("\"status\":404");
    }

    @Test
    @DisplayName("처리되지 않은 예외가 발생하면 status를 500으로 남긴다")
    void logsStatus500WhenChainThrows() {
        // given
        MockHttpServletRequest request = jsonRequest("{}");
        FilterChain throwingChain = (req, res) -> {
            throw new IllegalStateException("boom");
        };

        // when
        assertThatThrownBy(() -> filter.doFilter(request, response, throwingChain))
                .isInstanceOf(IllegalStateException.class);

        // then
        assertThat(loggedMessage()).contains("500");
    }

    @Test
    @DisplayName("로깅이 실패해도 응답 status와 본문은 그대로 전달된다")
    void keepsResponseIntactWhenLoggingFails() throws Exception {
        // given: 에러 경로에서만 호출되는 getHeaderNames()가 예외를 던지도록 폴트를 주입한다
        MockHttpServletRequest faultyRequest = new MockHttpServletRequest() {
            @Override
            public Enumeration<String> getHeaderNames() {
                throw new IllegalStateException("헤더 조회 실패");
            }
        };
        faultyRequest.setContentType("application/json");
        faultyRequest.setContent("{}".getBytes(StandardCharsets.UTF_8));
        String responseBody = "{\"status\":400,\"message\":\"잘못된 요청\"}";

        // when
        filter.doFilter(faultyRequest, response, respondWith(400, responseBody));

        // then
        assertThat(response.getStatus()).isEqualTo(400);
        assertThat(response.getContentAsString()).isEqualTo(responseBody);
    }

    @Test
    @DisplayName("observability.http.enabled가 false면 아무것도 남기지 않는다")
    void skipsLoggingWhenDisabled() throws Exception {
        // given
        HttpAccessLoggingFilter disabledFilter = newFilter(false);
        MockHttpServletRequest request = jsonRequest("{}");

        // when
        disabledFilter.doFilter(request, response, respondWith(400, "{\"status\":400}"));

        // then
        assertThat(appender.list).isEmpty();
    }

    @Test
    @DisplayName("요청 중 실행된 쿼리 수와 누적 DB 시간을 요약으로 남긴다")
    void doesNotIncludeQuerySummary() throws Exception {
        // given
        MockHttpServletRequest request = jsonRequest("{}");
        FilterChain queryingChain = (req, res) -> ((HttpServletResponse) res).setStatus(200);

        // when
        filter.doFilter(request, response, queryingChain);

        // then
        assertThat(loggedMessage()).doesNotContain("queries=").doesNotContain("totalDbTime=");
    }

    @Test
    @DisplayName("요청 처리가 끝나면 쿼리 집계 ThreadLocal을 비운다")
    void doesNotRequireQueryStatsCleanup() throws Exception {
        // given
        MockHttpServletRequest request = jsonRequest("{}");
        FilterChain queryingChain = (req, res) -> ((HttpServletResponse) res).setStatus(200);

        // when
        filter.doFilter(request, response, queryingChain);

        // then
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("요청당 쿼리 수가 임계값을 넘으면 경고를 남긴다")
    void doesNotEmitQueryCountWarning() throws Exception {
        // given: 임계값 10
        MockHttpServletRequest request = jsonRequest("{}");
        FilterChain nPlusOneChain = (req, res) -> ((HttpServletResponse) res).setStatus(200);

        // when
        filter.doFilter(request, response, nPlusOneChain);

        // then
        assertThat(appender.list).hasSize(1);
    }

    @Test
    @DisplayName("route에 path variable이 치환되지 않은 템플릿을 남긴다")
    void logsRouteTemplate() throws Exception {
        // given
        MockHttpServletRequest request = jsonRequest("{}");
        request.setRequestURI("/rooms/17/bingo");
        request.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/rooms/{roomId}/bingo");

        // when
        filter.doFilter(request, response, respondWith(200, "{}"));

        // then
        assertThat(loggedMdc()).containsEntry(MdcKeys.ROUTE, "/rooms/{roomId}/bingo");
    }

    @Test
    @DisplayName("route 속성이 없으면 raw URI로 폴백한다")
    void fallsBackToRawUriWhenRouteAttributeAbsent() throws Exception {
        // given: 401/403은 DispatcherServlet에 도달하지 않아 패턴 속성이 없다
        MockHttpServletRequest request = jsonRequest("{}");
        request.setRequestURI("/members/me");

        // when
        filter.doFilter(request, response, respondWith(401, "{\"status\":401}"));

        // then
        assertThat(loggedMdc()).containsEntry(MdcKeys.ROUTE, "/members/me");
    }

    private HttpAccessLoggingFilter newFilter(boolean enabled) {
        HttpAccessLoggingProperties properties = new HttpAccessLoggingProperties(enabled, MAX_BODY_LENGTH);
        return new HttpAccessLoggingFilter(properties);
    }

    private MockHttpServletRequest jsonRequest(String body) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setContentType("application/json");
        request.setContent(body.getBytes(StandardCharsets.UTF_8));
        return request;
    }

    // ContentCachingRequestWrapper는 하위가 실제로 읽은 바이트만 캐시하므로 체인에서 본문을 소비한다.
    // MockHttpServletResponse의 getWriter()는 기본 ISO-8859-1을 쓰므로, 프로덕션 기본값
    // (server.servlet.encoding.charset=UTF-8)과 같게 UTF-8을 명시한다.
    private FilterChain respondWith(int status, String responseBody) {
        return (req, res) -> {
            ((HttpServletRequest) req).getInputStream().readAllBytes();
            HttpServletResponse httpResponse = (HttpServletResponse) res;
            httpResponse.setCharacterEncoding(StandardCharsets.UTF_8.name());
            httpResponse.setStatus(status);
            httpResponse.getWriter().write(responseBody);
        };
    }

    private String loggedMessage() {
        assertThat(appender.list).isNotEmpty();
        return appender.list.get(0).getFormattedMessage();
    }

    private Map<String, String> loggedMdc() {
        assertThat(appender.list).isNotEmpty();
        return appender.list.get(0).getMDCPropertyMap();
    }
}
