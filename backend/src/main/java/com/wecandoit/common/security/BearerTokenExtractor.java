package com.wecandoit.common.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;

public final class BearerTokenExtractor {

    private static final String BEARER_PREFIX = "Bearer ";

    private BearerTokenExtractor() {
    }

    public static String extract(HttpServletRequest request) {
        return extract(request.getHeader(HttpHeaders.AUTHORIZATION));
    }

    public static String extract(String bearerToken) {
        if (bearerToken == null || !bearerToken.startsWith(BEARER_PREFIX)) {
            return null;
        }
        return bearerToken.substring(BEARER_PREFIX.length());
    }
}
