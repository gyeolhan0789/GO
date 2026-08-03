package com.wecandoit.common.logging;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

public final class SensitiveDataMasker {

    private static final Set<String> MASKED_HEADER_NAMES = Set.of("authorization", "cookie");
    private static final String MASK = "\"***\"";

    // 이름에 이 토큰 중 하나라도 포함되면 민감한 것으로 본다. HTTP 본문 필드명과 SQL 컬럼명
    // 마스킹 판정이 이 목록 하나만 참조해, 두 규칙이 따로 놀며 어긋나지 않게 한다.
    private static final String SENSITIVE_NAME_TOKENS = "password|token|secret|credential";
    private static final Pattern SENSITIVE_NAME = Pattern.compile("(?i).*(?:" + SENSITIVE_NAME_TOKENS + ").*");

    // "field": "value" 또는 "field": value 형태를 값만 마스킹한다. 값 안의 이스케이프된 따옴표도 소비한다.
    // 필드명을 완전일치로 나열하면 DTO가 자격증명 필드를 추가할 때마다 조용히 새므로
    // (currentPassword, newPassword, idToken 등) 이름에 토큰이 포함되기만 하면 마스킹한다.
    private static final Pattern MASKED_BODY_FIELD = Pattern.compile(
            "(\"[A-Za-z0-9_]*(?:" + SENSITIVE_NAME_TOKENS + ")[A-Za-z0-9_]*\"\\s*:\\s*)"
                    + "(\"(?:\\\\.|[^\"\\\\])*\"|[^,}\\s]+)",
            Pattern.CASE_INSENSITIVE);

    private SensitiveDataMasker() {
    }

    public static String maskBody(String body) {
        if (body == null || body.isEmpty()) {
            return body;
        }
        return MASKED_BODY_FIELD.matcher(body).replaceAll("$1" + MASK);
    }

    public static String maskHeaderValue(String headerName, String headerValue) {
        if (MASKED_HEADER_NAMES.contains(headerName.toLowerCase(Locale.ROOT))) {
            return MASK;
        }
        return headerValue;
    }

    // SQL 컬럼명처럼 따옴표·콜론이 없는 순수 식별자가 민감한지 판정할 때 쓴다.
    public static boolean isSensitiveName(String name) {
        return SENSITIVE_NAME.matcher(name).matches();
    }
}
