package com.wecandoit.common.logging;

import java.util.Arrays;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.ttddyy.dsproxy.ExecutionInfo;
import net.ttddyy.dsproxy.QueryInfo;
import net.ttddyy.dsproxy.listener.QueryExecutionListener;
import net.ttddyy.dsproxy.proxy.ParameterSetOperation;

@Slf4j
@RequiredArgsConstructor
public class QueryLoggingListener implements QueryExecutionListener {

    private static final String NULL_LITERAL = "NULL";
    private static final String SENSITIVE_VALUE_MASK = "'***'";
    private static final int NAMED_PARAMETER_ORDER = Integer.MAX_VALUE;

    private static final Pattern INSERT_COLUMNS =
            Pattern.compile("(?i)insert\\s+into\\s+\\S+\\s*\\(([^)]+)\\)\\s*values");
    private static final Pattern UPDATE_SET_CLAUSE =
            Pattern.compile("(?i)update\\s+\\S+\\s+set\\s+(.+?)(?:\\s+where\\s+|$)");

    private final QueryLoggingProperties properties;

    @Override
    public void beforeQuery(ExecutionInfo executionInfo, List<QueryInfo> queryInfoList) {
        // 실행 시간은 afterQuery에서만 확정되므로 여기서는 할 일이 없다.
    }

    @Override
    public void afterQuery(ExecutionInfo executionInfo, List<QueryInfo> queryInfoList) {
        long elapsedMs = executionInfo.getElapsedTime();
        // SQL 조립 비용이 있으므로 레벨이 꺼져 있으면 만들지 않는다.
        if (log.isDebugEnabled()) {
            log.debug("{}ms | {}", elapsedMs, inline(queryInfoList));
        }
    }

    // JPA가 생성하는 SQL에는 바인딩 파라미터를 실제 값으로 채워 넣는다 — N+1/슬로우 쿼리를
    // 그대로 복사해 DB에 붙여넣을 수 있어야 한다는 요구사항(AC-Q2) 때문에 datasource-proxy의
    // 내장 로깅(SQL과 파라미터를 분리 출력)을 쓰지 않고 직접 치환한다.
    private String inline(List<QueryInfo> queryInfoList) {
        return queryInfoList.stream()
                .map(this::inlineQuery)
                .collect(Collectors.joining("; "));
    }

    private String inlineQuery(QueryInfo queryInfo) {
        String query = queryInfo.getQuery();
        List<List<ParameterSetOperation>> parametersList = queryInfo.getParametersList();
        if (parametersList.isEmpty()) {
            return query;
        }
        String inlined = inlineParameterSet(query, parametersList.get(0));
        if (parametersList.size() == 1) {
            return inlined;
        }
        // 배치 실행은 같은 SQL이 여러 파라미터 세트로 돈다. 첫 세트만 보여주고 배치 크기를 덧붙인다.
        return inlined + " (batch of " + parametersList.size() + ")";
    }

    // JPA가 생성하는 SQL에는 문자열 리터럴 안의 '?'가 없으므로 순차 치환이 안전하다.
    private String inlineParameterSet(String query, List<ParameterSetOperation> operations) {
        List<String> columnOrder = columnOrderOf(query);
        Iterator<String> values = orderedValues(operations, columnOrder).iterator();
        StringBuilder inlined = new StringBuilder(query.length());
        for (int index = 0; index < query.length(); index++) {
            char current = query.charAt(index);
            if (current == '?' && values.hasNext()) {
                inlined.append(values.next());
                continue;
            }
            inlined.append(current);
        }
        return inlined.toString();
    }

    // INSERT의 컬럼 목록과 UPDATE의 SET절만 다룬다. WHERE절 컬럼은 위치를 매핑하지 않으므로
    // 값 마스킹 대상이 되지 않는다 — JPA가 password/token 값으로 조회하는 경로는 이 코드베이스에 없다.
    // Hibernate가 엔티티 저장 시 매핑된 컬럼을 전부 쓰는 경우가 있어(부분 업데이트 미설정),
    // Member 갱신 하나가 느려지면 password/fcm_token 값이 그 SQL에 함께 실린다 — 이것이 마스킹 대상이다.
    private List<String> columnOrderOf(String query) {
        Matcher insertMatcher = INSERT_COLUMNS.matcher(query);
        if (insertMatcher.find()) {
            return splitTrimmed(insertMatcher.group(1));
        }
        Matcher updateMatcher = UPDATE_SET_CLAUSE.matcher(query);
        if (updateMatcher.find()) {
            return splitTrimmed(updateMatcher.group(1)).stream()
                    .map(assignment -> assignment.split("=", 2)[0].trim())
                    .toList();
        }
        return List.of();
    }

    private List<String> splitTrimmed(String raw) {
        return Arrays.stream(raw.split(",")).map(String::trim).toList();
    }

    private List<String> orderedValues(List<ParameterSetOperation> operations, List<String> columnOrder) {
        return operations.stream()
                .sorted(Comparator.comparingInt(QueryLoggingListener::parameterIndex))
                .map(operation -> formatValue(operation, columnOrder))
                .toList();
    }

    private static int parameterIndex(ParameterSetOperation operation) {
        Object[] args = operation.getArgs();
        if (args.length > 0 && args[0] instanceof Integer index) {
            return index;
        }
        return NAMED_PARAMETER_ORDER;
    }

    private String formatValue(ParameterSetOperation operation, List<String> columnOrder) {
        if (ParameterSetOperation.isSetNullParameterOperation(operation)) {
            return NULL_LITERAL;
        }
        if (isSensitiveColumn(operation, columnOrder)) {
            return SENSITIVE_VALUE_MASK;
        }
        Object[] args = operation.getArgs();
        if (args.length < 2 || args[1] == null) {
            return NULL_LITERAL;
        }
        Object value = args[1];
        if (value instanceof Number || value instanceof Boolean) {
            return value.toString();
        }
        return "'" + value.toString().replace("'", "''") + "'";
    }

    private boolean isSensitiveColumn(ParameterSetOperation operation, List<String> columnOrder) {
        int index = parameterIndex(operation);
        if (index < 1 || index > columnOrder.size()) {
            return false;
        }
        return SensitiveDataMasker.isSensitiveName(columnOrder.get(index - 1));
    }
}
