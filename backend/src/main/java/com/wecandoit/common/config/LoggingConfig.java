package com.wecandoit.common.config;

import com.wecandoit.common.logging.HttpAccessLoggingFilter;
import com.wecandoit.common.logging.HttpAccessLoggingProperties;
import com.wecandoit.common.logging.MdcKeys;
import com.wecandoit.common.logging.TraceIdFilter;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executor;
import lombok.RequiredArgsConstructor;
import org.slf4j.MDC;
import org.springframework.boot.task.ThreadPoolTaskExecutorBuilder;
import org.springframework.boot.task.ThreadPoolTaskSchedulerCustomizer;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@RequiredArgsConstructor
public class LoggingConfig implements AsyncConfigurer {

    private final ThreadPoolTaskExecutorBuilder threadPoolTaskExecutorBuilder;

    // Spring Boot가 HIGHEST_PRECEDENCE에 ForwardedHeaderFilter를, HIGHEST_PRECEDENCE + 1에
    // WebMvcMetricsFilter를 등록하므로 두 값을 피한다. ForwardedHeaderFilter보다 뒤에 두어야
    // forwarded scheme/host가 반영된 요청을 관찰할 수 있다.
    private static final int TRACE_ID_FILTER_ORDER = Ordered.HIGHEST_PRECEDENCE + 10;
    private static final int ACCESS_LOG_FILTER_ORDER = Ordered.HIGHEST_PRECEDENCE + 11;

    @Bean
    public FilterRegistrationBean<TraceIdFilter> traceIdFilterRegistration() {
        FilterRegistrationBean<TraceIdFilter> registration = new FilterRegistrationBean<>(new TraceIdFilter());
        registration.setOrder(TRACE_ID_FILTER_ORDER);
        return registration;
    }

    @Bean
    public FilterRegistrationBean<HttpAccessLoggingFilter> httpAccessLoggingFilterRegistration(
            HttpAccessLoggingProperties properties
    ) {
        HttpAccessLoggingFilter filter = new HttpAccessLoggingFilter(properties);
        FilterRegistrationBean<HttpAccessLoggingFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setOrder(ACCESS_LOG_FILTER_ORDER);
        return registration;
    }

    // WebSocketConfig(@EnableWebSocketMessageBroker)가 clientInboundChannelExecutor 등
    // Executor 빈을 등록하면서 TaskExecutionAutoConfiguration의 applicationTaskExecutor가
    // @ConditionalOnMissingBean(Executor.class)에 걸려 더 이상 만들어지지 않는다. 그 결과
    // @Async가 유일한 TaskExecutor를 찾지 못해 SimpleAsyncTaskExecutor로 조용히 폴백되어
    // MdcTaskDecorator를 거치지 않는다(MdcTaskDecoratorWiringTest가 이를 잡아낸다). AsyncConfigurer로
    // 직접 실행기를 지정해 다른 Executor 빈 수와 무관하게 @Async의 실행기를 고정한다.
    // ThreadPoolTaskExecutorBuilder를 쓰는 이유: spring.task.execution.* 설정을 그대로 반영한
    // 실행기를 Boot 자동 설정과 동일하게 구성하면서 decorator만 추가한다. @Bean으로 등록하지 않으므로
    // 컨테이너가 InitializingBean 생명주기를 대신 타지 않는다 — initialize()를 직접 호출해야 한다.
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor =
                threadPoolTaskExecutorBuilder.taskDecorator(new MdcTaskDecorator()).build();
        executor.initialize();
        return executor;
    }

    // ThreadPoolTaskSchedulerCustomizer의 콜백은 빌더가 아니라 스케줄러 인스턴스를 받으므로 setter를 쓴다.
    @Bean
    public ThreadPoolTaskSchedulerCustomizer scheduledTraceIdCustomizer() {
        ScheduledTraceIdDecorator decorator = new ScheduledTraceIdDecorator();
        return scheduler -> scheduler.setTaskDecorator(decorator);
    }

    // @Async 작업은 별도 풀 스레드에서 실행되어 요청 스레드의 MDC를 상속하지 않는다.
    // 제출 시점의 MDC를 복사해 넘기고, 실행 후 풀 스레드를 오염시키지 않도록 비운다.
    // 이 클래스를 필요로 하는 곳이 getAsyncExecutor() 하나뿐이라 여기 중첩해 둔다.
    static class MdcTaskDecorator implements TaskDecorator {

        @Override
        public Runnable decorate(Runnable runnable) {
            Map<String, String> submitterContext = MDC.getCopyOfContextMap();
            return () -> {
                // MDC가 비어 있으면 getCopyOfContextMap()이 null을 반환하고 setContextMap(null)은 예외를 던진다.
                if (submitterContext != null) {
                    MDC.setContextMap(submitterContext);
                }
                try {
                    runnable.run();
                } finally {
                    MDC.clear();
                }
            };
        }
    }

    // 스케줄 작업에는 상속할 요청 traceId가 없으므로 합성 traceId를 부여한다.
    // decorate()는 등록 시점에 한 번만 호출되므로 traceId 생성은 실행(run) 시점에 해야 한다.
    // 이 빈을 필요로 하는 곳이 scheduledTraceIdCustomizer() 하나뿐이라 여기 중첩해 둔다.
    static class ScheduledTraceIdDecorator implements TaskDecorator {

        private static final String SCHEDULED_TRACE_ID_PREFIX = "sch-";
        private static final int TRACE_ID_LENGTH = 8;

        @Override
        public Runnable decorate(Runnable runnable) {
            return () -> {
                MDC.put(MdcKeys.TRACE_ID, generateScheduledTraceId());
                try {
                    runnable.run();
                } finally {
                    MDC.clear();
                }
            };
        }

        private String generateScheduledTraceId() {
            return SCHEDULED_TRACE_ID_PREFIX + UUID.randomUUID().toString().substring(0, TRACE_ID_LENGTH);
        }
    }
}
