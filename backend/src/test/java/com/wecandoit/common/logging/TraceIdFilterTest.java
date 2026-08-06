package com.wecandoit.common.logging;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.FilterChain;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class TraceIdFilterTest {

    private final TraceIdFilter filter = new TraceIdFilter();

    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        MDC.clear();
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
    }

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    @DisplayName("X-Request-Id 헤더가 없으면 traceId를 새로 생성한다")
    void generatesTraceIdWhenHeaderAbsent() throws Exception {
        // given
        AtomicReference<String> traceIdDuringChain = new AtomicReference<>();
        FilterChain chain = captureTraceId(traceIdDuringChain);

        // when
        filter.doFilter(request, response, chain);

        // then
        assertThat(traceIdDuringChain.get()).hasSize(8);
    }

    @Test
    @DisplayName("X-Request-Id 헤더가 있으면 그 값을 traceId로 채택한다")
    void adoptsInboundTraceIdHeader() throws Exception {
        // given
        request.addHeader(TraceIdFilter.TRACE_ID_HEADER, "inbound-trace");
        AtomicReference<String> traceIdDuringChain = new AtomicReference<>();
        FilterChain chain = captureTraceId(traceIdDuringChain);

        // when
        filter.doFilter(request, response, chain);

        // then
        assertThat(traceIdDuringChain.get()).isEqualTo("inbound-trace");
    }

    @Test
    @DisplayName("X-Request-Id 헤더가 공백이면 traceId를 새로 생성한다")
    void generatesTraceIdWhenHeaderBlank() throws Exception {
        // given
        request.addHeader(TraceIdFilter.TRACE_ID_HEADER, "   ");
        AtomicReference<String> traceIdDuringChain = new AtomicReference<>();
        FilterChain chain = captureTraceId(traceIdDuringChain);

        // when
        filter.doFilter(request, response, chain);

        // then
        assertThat(traceIdDuringChain.get()).hasSize(8);
    }

    @Test
    @DisplayName("응답 헤더로 traceId를 반환한다")
    void returnsTraceIdAsResponseHeader() throws Exception {
        // given
        AtomicReference<String> traceIdDuringChain = new AtomicReference<>();
        FilterChain chain = captureTraceId(traceIdDuringChain);

        // when
        filter.doFilter(request, response, chain);

        // then
        assertThat(response.getHeader(TraceIdFilter.TRACE_ID_HEADER)).isEqualTo(traceIdDuringChain.get());
    }

    @Test
    @DisplayName("필터를 통과한 뒤 MDC를 비운다")
    void clearsMdcAfterChain() throws Exception {
        // given
        FilterChain chain = captureTraceId(new AtomicReference<>());

        // when
        filter.doFilter(request, response, chain);

        // then
        assertThat(MDC.get(MdcKeys.TRACE_ID)).isNull();
    }

    @Test
    @DisplayName("체인에서 예외가 발생해도 MDC를 비운다")
    void clearsMdcWhenChainThrows() {
        // given
        FilterChain chain = (req, res) -> {
            throw new IllegalStateException("boom");
        };

        // when
        try {
            filter.doFilter(request, response, chain);
        } catch (Exception ignored) {
            // 예외 전파 자체는 이 테스트의 검증 대상이 아니다
        }

        // then
        assertThat(MDC.get(MdcKeys.TRACE_ID)).isNull();
    }

    private FilterChain captureTraceId(AtomicReference<String> holder) {
        return (req, res) -> holder.set(MDC.get(MdcKeys.TRACE_ID));
    }
}
