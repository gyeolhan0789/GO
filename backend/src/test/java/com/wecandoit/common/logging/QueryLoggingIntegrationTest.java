package com.wecandoit.common.logging;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.sql.Connection;
import java.sql.PreparedStatement;
import javax.sql.DataSource;
import net.ttddyy.dsproxy.support.ProxyDataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class QueryLoggingIntegrationTest {

    @Autowired
    private DataSource dataSource;

    private ListAppender<ILoggingEvent> appender;
    private Logger listenerLogger;
    private Level originalLevel;

    @BeforeEach
    void setUp() {
        listenerLogger = (Logger) LoggerFactory.getLogger(QueryLoggingListener.class);
        originalLevel = listenerLogger.getLevel();
        listenerLogger.setLevel(Level.DEBUG);
        appender = new ListAppender<>();
        appender.start();
        listenerLogger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        listenerLogger.detachAppender(appender);
        listenerLogger.setLevel(originalLevel);
    }

    @Test
    @DisplayName("DataSource가 datasource-proxy로 감싸여 있다")
    void wrapsDataSourceWithProxy() {
        // given & when & then
        assertThat(dataSource).isInstanceOf(ProxyDataSource.class);
    }

    @Test
    @DisplayName("실제 쿼리 실행 시 바인딩 파라미터가 치환된 SQL과 실행시간을 남긴다")
    void logsInlinedSqlWithElapsedTime() throws Exception {
        // given
        String sql = "select count(*) from member where id = ?";

        // when
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, 17L);
            statement.executeQuery();
        }

        // then
        assertThat(loggedMessages())
                .anyMatch(message -> message.contains("select count(*) from member where id = 17"));
        assertThat(loggedMessages()).anyMatch(message -> message.contains("ms |"));
    }

    @Test
    @DisplayName("arm된 요청 컨텍스트에서는 실제 쿼리가 집계된다")
    void logsRealQueryWithoutRequestAggregation() throws Exception {
        // given

        // when
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement("select count(*) from member")) {
            statement.executeQuery();
        }

        // then
        assertThat(loggedMessages()).anyMatch(message -> message.contains("select count(*) from member"));
    }

    @Test
    @DisplayName("arm되지 않은 컨텍스트에서 쿼리를 실행해도 집계가 생기지 않는다")
    void logsRealQueryWithoutRequestScope() throws Exception {
        // given: arm() 없음 — @Async, @Scheduled 경로가 이 상태다

        // when
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement("select count(*) from member")) {
            statement.executeQuery();
        }

        // then
        assertThat(loggedMessages()).anyMatch(message -> message.contains("select count(*) from member"));
    }

    private java.util.List<String> loggedMessages() {
        return appender.list.stream().map(ILoggingEvent::getFormattedMessage).toList();
    }
}
