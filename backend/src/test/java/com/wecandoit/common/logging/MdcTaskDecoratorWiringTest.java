package com.wecandoit.common.logging;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.annotation.Async;
import org.springframework.test.context.ActiveProfiles;

// MdcTaskDecorator가 단위 테스트로만 검증되어 있고, Spring Boot가 실제로 그 빈을
// applicationTaskExecutor(@Async)에 연결하는지는 증명된 적이 없다. NotificationEventListener의
// @Async 경로가 바로 이 배선에 의존한다.
@SpringBootTest
@ActiveProfiles("test")
@Import(MdcTaskDecoratorWiringTest.AsyncProbeConfig.class)
class MdcTaskDecoratorWiringTest {

    @Autowired
    private AsyncProbe asyncProbe;

    @BeforeEach
    void setUp() {
        MDC.clear();
    }

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    @DisplayName("실제 applicationTaskExecutor로 실행된 @Async 메서드가 호출 스레드의 MDC를 물려받는다")
    void asyncMethodInheritsCallerMdcThroughRealExecutor() throws InterruptedException {
        // given
        MDC.put(MdcKeys.TRACE_ID, "caller-trace-id");
        AtomicReference<String> traceIdInAsyncThread = new AtomicReference<>();
        CountDownLatch completed = new CountDownLatch(1);

        // when
        asyncProbe.run(traceIdInAsyncThread, completed);

        // then: 다른 스레드에서 비동기로 실행되므로 완료를 기다린다
        assertThat(completed.await(2, TimeUnit.SECONDS)).isTrue();
        assertThat(traceIdInAsyncThread.get()).isEqualTo("caller-trace-id");
    }

    @TestConfiguration
    static class AsyncProbeConfig {

        @Bean
        AsyncProbe asyncProbe() {
            return new AsyncProbe();
        }
    }

    static class AsyncProbe {

        @Async
        void run(AtomicReference<String> traceIdHolder, CountDownLatch completed) {
            traceIdHolder.set(MDC.get(MdcKeys.TRACE_ID));
            completed.countDown();
        }
    }
}
