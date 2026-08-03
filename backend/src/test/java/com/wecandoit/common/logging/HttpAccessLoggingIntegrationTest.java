package com.wecandoit.common.logging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.ConsoleAppender;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wecandoit.common.jwt.JwtProvider;
import com.wecandoit.common.jwt.TokenRepository;
import java.io.IOException;
import java.util.Map;
import net.logstash.logback.encoder.LogstashEncoder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

// 필터 등록(FilterRegistrationBean)과 springSecurityFilterChain이 모두 필요하므로
// standaloneSetup 대신 전체 컨텍스트를 로딩한다. back-test-convention.md:13,21 이탈은 계획 ADR에 기록되어 있다.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(HttpAccessLoggingIntegrationTest.LoggingTestConfig.class)
class HttpAccessLoggingIntegrationTest {

    // 최상위 클래스로 두면 컴포넌트 스캔(com.wecandoit)과 @Import 양쪽에서 발견되어
    // 핸들러 매핑이 중복 등록된다. 테스트 클래스에 중첩해 스캔 대상에서 제외한다.
    @TestConfiguration
    static class LoggingTestConfig {

        @Bean
        LoggingTestController loggingTestController() {
            return new LoggingTestController();
        }
    }

    @RestController
    @RequestMapping("/test/logging")
    static class LoggingTestController {

        @GetMapping("/ok")
        Map<String, String> ok() {
            return Map.of("result", "ok");
        }

        @GetMapping("/echo/{id}")
        Map<String, Long> echo(@PathVariable long id) {
            return Map.of("id", id);
        }

        @GetMapping("/boom")
        String boom() {
            throw new IllegalStateException("boom");
        }

        @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        Map<String, Object> upload(@RequestParam("file") MultipartFile file) throws IOException {
            return Map.of("size", file.getBytes().length);
        }
    }

    private static final String PROTECTED_PATH = "/members/me";
    private static final long TEST_MEMBER_ID = 1L;
    private static final String TEST_ROLE = "USER";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtProvider jwtProvider;

    // 이 테스트 클래스가 처음으로 실제 인증 경로(JwtAuthenticationFilter)를 지나가므로
    // tokenRepository.isBlacklisted()가 Redis를 호출한다. 다른 Security 관련 테스트도
    // TokenRepository를 전부 Mock으로 처리하므로(JwtAuthenticationFilterTest) 동일한 관례를 따른다.
    @MockitoBean
    private TokenRepository tokenRepository;

    private ListAppender<ILoggingEvent> appender;
    private Logger filterLogger;

    @BeforeEach
    void setUp() {
        given(tokenRepository.isBlacklisted(anyString())).willReturn(false);
        filterLogger = (Logger) LoggerFactory.getLogger(HttpAccessLoggingFilter.class);
        appender = new ListAppender<>();
        appender.start();
        filterLogger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        filterLogger.detachAppender(appender);
    }

    @Test
    @DisplayName("인증 없이 보호된 API를 호출하면 401 응답 본문이 access log에 남는다")
    void logsUnauthorizedResponseBody() throws Exception {
        // when
        MvcResult result = mockMvc.perform(get(PROTECTED_PATH)).andReturn();

        // then
        assertThat(result.getResponse().getStatus()).isEqualTo(401);
        assertThat(loggedEvent().getFormattedMessage()).contains("401").contains("인증이 필요합니다.");
    }

    @Test
    @DisplayName("401 응답 본문이 ErrorResponse 형식과 정확히 일치한다")
    void returnsExactUnauthorizedBody() throws Exception {
        // when
        MvcResult result = mockMvc.perform(get(PROTECTED_PATH)).andReturn();

        // then
        assertThat(result.getResponse().getContentAsString())
                .isEqualTo("{\"status\":401,\"message\":\"인증이 필요합니다.\"}");
    }

    @Test
    @DisplayName("응답 헤더의 traceId와 access log의 traceId가 같다")
    void correlatesTraceIdBetweenResponseHeaderAndLog() throws Exception {
        // when
        MvcResult result = mockMvc.perform(get(PROTECTED_PATH)).andReturn();

        // then
        String traceId = result.getResponse().getHeader(TraceIdFilter.TRACE_ID_HEADER);
        assertThat(traceId).isNotBlank();
        assertThat(loggedEvent().getMDCPropertyMap()).containsEntry(MdcKeys.TRACE_ID, traceId);
    }

    @Test
    @DisplayName("요청이 보낸 X-Request-Id를 traceId로 채택한다")
    void adoptsInboundTraceId() throws Exception {
        // when
        MvcResult result = mockMvc
                .perform(get(PROTECTED_PATH).header(TraceIdFilter.TRACE_ID_HEADER, "inbound-trace"))
                .andReturn();

        // then
        assertThat(result.getResponse().getHeader(TraceIdFilter.TRACE_ID_HEADER)).isEqualTo("inbound-trace");
        assertThat(loggedEvent().getMDCPropertyMap()).containsEntry(MdcKeys.TRACE_ID, "inbound-trace");
    }

    @Test
    @DisplayName("logback이 access log를 traceId를 포함한 유효한 JSON 한 줄로 인코딩한다")
    void encodesAccessLogAsJsonWithTraceId() throws Exception {
        // given
        mockMvc.perform(get(PROTECTED_PATH)).andReturn();

        // when
        byte[] encoded = jsonEncoder().encode(loggedEvent());
        JsonNode json = new ObjectMapper().readTree(encoded);

        // then
        assertThat(json.hasNonNull("traceId")).isTrue();
        assertThat(json.get("message").asText()).contains("401");
    }

    @Test
    @DisplayName("인증된 2xx 응답에는 본문이 남지 않는다")
    void logsNoBodyForAuthenticated2xxResponse() throws Exception {
        // when
        MvcResult result = mockMvc.perform(authenticated(get("/test/logging/ok"))).andReturn();

        // then
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        assertThat(loggedEvent().getFormattedMessage()).doesNotContain("req=").doesNotContain("resp=");
    }

    @Test
    @DisplayName("실제 DispatcherServlet 매핑에서 path variable이 치환되지 않은 route 템플릿을 남긴다")
    void logsRouteTemplateFromRealDispatcherServlet() throws Exception {
        // when
        mockMvc.perform(authenticated(get("/test/logging/echo/{id}", 42))).andReturn();

        // then
        assertThat(loggedEvent().getMDCPropertyMap()).containsEntry(MdcKeys.ROUTE, "/test/logging/echo/{id}");
    }

    // 미처리 예외가 실제 컨테이너에서 클라이언트에게 표준 500 본문으로 전달되는지는
    // HttpAccessLoggingRealContainerTest에서 검증한다. MockMvc의 TestDispatcherServlet은
    // Tomcat의 StandardHostValve 에러 페이지 전달을 흉내 내지 않아, 이 클래스에서 확인하면
    // 예외가 mockMvc.perform() 밖으로 그대로 던져져 실제 동작을 대표하지 못한다.

    @Test
    @DisplayName("실제 multipart 업로드가 성공하고 본문이 로그에 남지 않는다")
    void handlesRealMultipartUploadWithoutLoggingBody() throws Exception {
        // given
        byte[] fileBytes = "binary-image-bytes".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", fileBytes);

        // when
        MvcResult result = mockMvc
                .perform(authenticated(MockMvcRequestBuilders.multipart("/test/logging/upload").file(file)))
                .andReturn();

        // then
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        assertThat(result.getResponse().getContentAsString()).contains(String.valueOf(fileBytes.length));
        assertThat(loggedEvent().getFormattedMessage()).doesNotContain("binary-image-bytes");
    }

    private <B extends org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder> B authenticated(
            B builder) {
        String accessToken = jwtProvider.createAccessToken(TEST_MEMBER_ID, TEST_ROLE);
        builder.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);
        return builder;
    }

    private ILoggingEvent loggedEvent() {
        assertThat(appender.list).isNotEmpty();
        return appender.list.get(0);
    }

    @SuppressWarnings("unchecked")
    private LogstashEncoder jsonEncoder() {
        Logger rootLogger = (Logger) LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
        ConsoleAppender<ILoggingEvent> consoleAppender =
                (ConsoleAppender<ILoggingEvent>) rootLogger.getAppender("CONSOLE");
        assertThat(consoleAppender).isNotNull();
        return (LogstashEncoder) consoleAppender.getEncoder();
    }
}
