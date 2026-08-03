package com.wecandoit.common.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.wecandoit.common.logging.MdcKeys;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

class LoggingConfigTest {

    @BeforeEach
    void setUp() {
        MDC.clear();
    }

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Nested
    @DisplayName("mdcTaskDecorator")
    class MdcTaskDecoratorTest {

        private final LoggingConfig.MdcTaskDecorator decorator = new LoggingConfig.MdcTaskDecorator();

        @Test
        @DisplayName("제출 시점의 MDC를 실행 스레드로 복사한다")
        void copiesSubmitterMdcToExecutingThread() throws Exception {
            // given
            MDC.put(MdcKeys.TRACE_ID, "abc12345");
            AtomicReference<String> traceIdInWorker = new AtomicReference<>();
            Runnable decorated = decorator.decorate(() -> traceIdInWorker.set(MDC.get(MdcKeys.TRACE_ID)));

            // when
            runOnSeparateThread(decorated);

            // then
            assertThat(traceIdInWorker.get()).isEqualTo("abc12345");
        }

        @Test
        @DisplayName("제출 시점 MDC가 비어 있으면 예외를 던지지 않는다")
        void doesNotThrowWhenSubmitterMdcIsEmpty() {
            // given
            Runnable decorated = decorator.decorate(() -> {
            });

            // when & then
            assertThatCode(() -> runOnSeparateThread(decorated)).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("실행 후 실행 스레드의 MDC를 비운다")
        void clearsMdcOnExecutingThreadAfterRun() throws Exception {
            // given
            MDC.put(MdcKeys.TRACE_ID, "abc12345");
            AtomicReference<String> traceIdAfterRun = new AtomicReference<>();
            Runnable decorated = decorator.decorate(() -> {
            });

            // when
            runOnSeparateThread(() -> {
                decorated.run();
                traceIdAfterRun.set(MDC.get(MdcKeys.TRACE_ID));
            });

            // then
            assertThat(traceIdAfterRun.get()).isNull();
        }

        @Test
        @DisplayName("제출 스레드의 MDC는 변경하지 않는다")
        void leavesSubmitterMdcUnchanged() throws Exception {
            // given
            MDC.put(MdcKeys.TRACE_ID, "abc12345");
            Runnable decorated = decorator.decorate(() -> MDC.put(MdcKeys.TRACE_ID, "overwritten"));

            // when
            runOnSeparateThread(decorated);

            // then
            assertThat(MDC.get(MdcKeys.TRACE_ID)).isEqualTo("abc12345");
        }

        private void runOnSeparateThread(Runnable runnable) throws InterruptedException {
            Thread worker = new Thread(runnable);
            worker.start();
            worker.join();
        }
    }

    @Nested
    @DisplayName("scheduledTraceIdCustomizer의 TaskDecorator")
    class ScheduledTraceIdDecoratorTest {

        private final LoggingConfig.ScheduledTraceIdDecorator decorator =
                new LoggingConfig.ScheduledTraceIdDecorator();

        @Test
        @DisplayName("스케줄 작업에 sch- 접두어 traceId를 부여한다")
        void assignsScheduledTraceIdPrefix() {
            // given
            AtomicReference<String> traceIdDuringRun = new AtomicReference<>();
            Runnable decorated = decorator.decorate(() -> traceIdDuringRun.set(MDC.get(MdcKeys.TRACE_ID)));

            // when
            decorated.run();

            // then
            assertThat(traceIdDuringRun.get()).startsWith("sch-").hasSize(12);
        }

        @Test
        @DisplayName("실행마다 서로 다른 traceId를 생성한다")
        void generatesDistinctTraceIdPerExecution() {
            // given
            AtomicReference<String> firstTraceId = new AtomicReference<>();
            AtomicReference<String> secondTraceId = new AtomicReference<>();
            Runnable decorated = decorator.decorate(() -> {
                if (firstTraceId.get() == null) {
                    firstTraceId.set(MDC.get(MdcKeys.TRACE_ID));
                    return;
                }
                secondTraceId.set(MDC.get(MdcKeys.TRACE_ID));
            });

            // when
            decorated.run();
            decorated.run();

            // then
            assertThat(secondTraceId.get()).isNotEqualTo(firstTraceId.get());
        }

        @Test
        @DisplayName("실행 후 MDC를 비운다")
        void clearsMdcAfterRun() {
            // given
            Runnable decorated = decorator.decorate(() -> {
            });

            // when
            decorated.run();

            // then
            assertThat(MDC.get(MdcKeys.TRACE_ID)).isNull();
        }
    }
}
