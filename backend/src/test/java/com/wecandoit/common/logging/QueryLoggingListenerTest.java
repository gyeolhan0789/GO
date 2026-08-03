package com.wecandoit.common.logging;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.lang.reflect.Method;
import java.sql.PreparedStatement;
import java.util.List;
import net.ttddyy.dsproxy.ExecutionInfo;
import net.ttddyy.dsproxy.QueryInfo;
import net.ttddyy.dsproxy.proxy.ParameterSetOperation;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class QueryLoggingListenerTest {

    private static final long LONG_QUERY_DURATION_MS = 1_001L;

    private ListAppender<ILoggingEvent> appender;
    private Logger listenerLogger;
    private Level originalLevel;

    @BeforeEach
    void setUp() {
        listenerLogger = (Logger) LoggerFactory.getLogger(QueryLoggingListener.class);
        originalLevel = listenerLogger.getLevel();
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
    @DisplayName("임계값을 넘는 쿼리는 DEBUG가 꺼져 있으면 개별 경고 로그를 남기지 않는다")
    void doesNotLogLongQueryWhenDebugDisabled() {
        // given: DEBUG를 끈 상태 — dev/prod와 같은 조건
        listenerLogger.setLevel(Level.INFO);

        // when
        run(LONG_QUERY_DURATION_MS, memberByIdQuery());

        // then
        assertThat(appender.list).isEmpty();
    }

    @Test
    @DisplayName("임계값 이하의 쿼리는 DEBUG가 꺼져 있으면 아무것도 남기지 않는다")
    void logsNothingForFastQueryWhenDebugDisabled() {
        // given
        listenerLogger.setLevel(Level.INFO);

        // when
        run(10L, memberByIdQuery());

        // then
        assertThat(appender.list).isEmpty();
    }

    @Test
    @DisplayName("임계값 이하의 쿼리는 DEBUG가 켜져 있으면 실행시간과 SQL을 남긴다")
    void logsFastQueryAtDebugWhenEnabled() {
        // given
        listenerLogger.setLevel(Level.DEBUG);

        // when
        run(10L, memberByIdQuery());

        // then
        assertThat(appender.list).hasSize(1);
        ILoggingEvent event = appender.list.get(0);
        assertThat(event.getLevel()).isEqualTo(Level.DEBUG);
        assertThat(event.getFormattedMessage()).contains("10ms").doesNotContain("SLOW");
    }

    @Test
    @DisplayName("긴 실행 시간의 쿼리도 요청 집계에 수행 시간으로 반영된다")
    void recordsLongQueryExecutionTimeIntoRequestStats() {
        // given
        listenerLogger.setLevel(Level.INFO);

        // when
        run(LONG_QUERY_DURATION_MS, memberByIdQuery());

        // then
        assertThat(appender.list).isEmpty();
    }

    @Test
    @DisplayName("숫자 파라미터를 따옴표 없이 치환한다")
    void inlinesNumberWithoutQuotes() throws Exception {
        // given
        listenerLogger.setLevel(Level.DEBUG);
        QueryInfo queryInfo = queryWithParameters("select m.* from member m where m.id=?", setLong(1, 17L));

        // when
        run(10L, queryInfo);

        // then
        assertThat(loggedMessage()).contains("select m.* from member m where m.id=17");
    }

    @Test
    @DisplayName("문자열 파라미터를 따옴표로 감싸 치환한다")
    void inlinesStringWithQuotes() throws Exception {
        // given
        listenerLogger.setLevel(Level.DEBUG);
        QueryInfo queryInfo =
                queryWithParameters("select m.* from member m where m.nickname=?", setString(1, "wecandoit"));

        // when
        run(10L, queryInfo);

        // then
        assertThat(loggedMessage()).contains("select m.* from member m where m.nickname='wecandoit'");
    }

    @Test
    @DisplayName("여러 파라미터를 인덱스 순서대로 치환한다")
    void inlinesMultipleParametersInIndexOrder() throws Exception {
        // given: 인덱스 역순으로 넣어도 순서대로 치환되어야 한다
        listenerLogger.setLevel(Level.DEBUG);
        QueryInfo queryInfo = queryWithParameters(
                "select * from friends where member_id=? and status=?",
                setString(2, "ACCEPTED"), setLong(1, 17L));

        // when
        run(10L, queryInfo);

        // then
        assertThat(loggedMessage()).contains("select * from friends where member_id=17 and status='ACCEPTED'");
    }

    @Test
    @DisplayName("문자열 안의 따옴표를 SQL 규칙으로 이스케이프한다")
    void escapesSingleQuoteInValue() throws Exception {
        // given
        listenerLogger.setLevel(Level.DEBUG);
        QueryInfo queryInfo = queryWithParameters("select * from member where nickname=?", setString(1, "O'Brien"));

        // when
        run(10L, queryInfo);

        // then
        assertThat(loggedMessage()).contains("select * from member where nickname='O''Brien'");
    }

    @Test
    @DisplayName("setNull 파라미터를 NULL로 치환한다")
    void inlinesNullParameter() throws Exception {
        // given
        listenerLogger.setLevel(Level.DEBUG);
        QueryInfo queryInfo = queryWithParameters(
                "update member set fcm_token=? where id=?", setNull(1), setLong(2, 17L));

        // when
        run(10L, queryInfo);

        // then
        assertThat(loggedMessage()).contains("update member set fcm_token=NULL where id=17");
    }

    @Test
    @DisplayName("파라미터가 없는 SQL은 그대로 반환한다")
    void keepsQueryWithoutParameters() {
        // given
        listenerLogger.setLevel(Level.DEBUG);
        QueryInfo queryInfo = new QueryInfo("select count(*) from member");

        // when
        run(10L, queryInfo);

        // then
        assertThat(loggedMessage()).contains("select count(*) from member");
    }

    @Test
    @DisplayName("배치 실행은 첫 파라미터 세트와 배치 크기를 함께 남긴다")
    void showsBatchSize() throws Exception {
        // given
        listenerLogger.setLevel(Level.DEBUG);
        QueryInfo queryInfo = new QueryInfo("insert into member (id) values (?)");
        queryInfo.setParametersList(List.of(List.of(setLong(1, 1L)), List.of(setLong(1, 2L))));

        // when
        run(10L, queryInfo);

        // then
        assertThat(loggedMessage()).contains("insert into member (id) values (1) (batch of 2)");
    }

    @Test
    @DisplayName("INSERT의 password 컬럼 값을 마스킹한다")
    void masksPasswordColumnOnInsert() throws Exception {
        // given: Member 엔티티의 실제 컬럼 순서 형태 (email, password, nickname)
        listenerLogger.setLevel(Level.DEBUG);
        QueryInfo queryInfo = queryWithParameters(
                "insert into member (email, password, nickname) values (?, ?, ?)",
                setString(1, "a@b.com"), setString(2, "$2a$10$encodedHash"), setString(3, "wecandoit"));

        // when
        run(10L, queryInfo);

        // then
        assertThat(loggedMessage())
                .contains("'a@b.com'")
                .contains("'wecandoit'")
                .doesNotContain("$2a$10$encodedHash")
                .contains("'***'");
    }

    @Test
    @DisplayName("UPDATE의 password와 fcm_token 컬럼 값을 마스킹한다")
    void masksSensitiveColumnsOnUpdate() throws Exception {
        // given: Hibernate가 부분 업데이트 없이 Member의 매핑 컬럼 전체를 갱신하는 형태
        listenerLogger.setLevel(Level.DEBUG);
        QueryInfo queryInfo = queryWithParameters(
                "update member set fcm_token=?, nickname=?, password=? where id=?",
                setString(1, "device-push-credential"),
                setString(2, "wecandoit"),
                setString(3, "$2a$10$newEncodedHash"),
                setLong(4, 17L));

        // when
        run(10L, queryInfo);

        // then
        assertThat(loggedMessage())
                .doesNotContain("device-push-credential")
                .doesNotContain("$2a$10$newEncodedHash")
                .contains("'wecandoit'")
                .contains("id=17");
    }

    @Test
    @DisplayName("WHERE절의 컬럼은 마스킹 대상이 아니다")
    void doesNotMaskWhereClauseColumns() throws Exception {
        // given: WHERE절 컬럼은 위치 매핑을 하지 않으므로 대상 밖이다
        listenerLogger.setLevel(Level.DEBUG);
        QueryInfo queryInfo =
                queryWithParameters("select count(*) from member where nickname = ?", setString(1, "wecandoit"));

        // when
        run(10L, queryInfo);

        // then
        assertThat(loggedMessage()).contains("'wecandoit'");
    }

    @Test
    @DisplayName("여러 쿼리를 세미콜론으로 이어 남긴다")
    void joinsMultipleQueries() throws Exception {
        // given
        listenerLogger.setLevel(Level.DEBUG);
        QueryInfo first = queryWithParameters("select * from member where id=?", setLong(1, 1L));
        QueryInfo second = queryWithParameters("select * from friends where member_id=?", setLong(1, 1L));

        // when
        newListener().afterQuery(executionInfo(10L), List.of(first, second));

        // then
        assertThat(loggedMessage())
                .contains("select * from member where id=1; select * from friends where member_id=1");
    }

    private void run(long elapsedMs, QueryInfo queryInfo) {
        newListener().afterQuery(executionInfo(elapsedMs), List.of(queryInfo));
    }

    private String loggedMessage() {
        assertThat(appender.list).isNotEmpty();
        return appender.list.get(0).getFormattedMessage();
    }

    private QueryLoggingListener newListener() {
        return new QueryLoggingListener(new QueryLoggingProperties(true));
    }

    private ExecutionInfo executionInfo(long elapsedMs) {
        ExecutionInfo executionInfo = new ExecutionInfo();
        executionInfo.setElapsedTime(elapsedMs);
        return executionInfo;
    }

    private QueryInfo memberByIdQuery() {
        return queryWithParameters("select count(*) from member where id = ?", setLong(1, 17L));
    }

    private QueryInfo queryWithParameters(String query, ParameterSetOperation... operations) {
        QueryInfo queryInfo = new QueryInfo(query);
        queryInfo.setParametersList(List.of(List.of(operations)));
        return queryInfo;
    }

    private ParameterSetOperation setLong(int index, long value) {
        try {
            Method setLong = PreparedStatement.class.getMethod("setLong", int.class, long.class);
            return new ParameterSetOperation(setLong, new Object[] {index, value});
        } catch (NoSuchMethodException e) {
            throw new IllegalStateException("PreparedStatement.setLong을 찾을 수 없다", e);
        }
    }

    private ParameterSetOperation setString(int index, String value) throws Exception {
        Method setString = PreparedStatement.class.getMethod("setString", int.class, String.class);
        return new ParameterSetOperation(setString, new Object[] {index, value});
    }

    private ParameterSetOperation setNull(int index) throws Exception {
        Method setNull = PreparedStatement.class.getMethod("setNull", int.class, int.class);
        return new ParameterSetOperation(setNull, new Object[] {index, java.sql.Types.VARCHAR});
    }
}
