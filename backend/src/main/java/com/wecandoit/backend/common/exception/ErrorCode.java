package com.wecandoit.backend.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "토큰이 만료되었습니다."),
    TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."),
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    REFRESH_TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "유효하지 않은 Refresh Token입니다."),
    OAUTH_ACCESS_DENIED(HttpStatus.UNAUTHORIZED, "OAuth 로그인 권한이 거부되었습니다."),
    OAUTH_EMAIL_NOT_PROVIDED(HttpStatus.BAD_REQUEST, "소셜 계정에서 이메일을 제공하지 않았습니다."),
    OAUTH_TOKEN_EXCHANGE_FAILED(HttpStatus.BAD_GATEWAY, "소셜 로그인 토큰 교환에 실패했습니다."),
    OAUTH_PROVIDER_MISMATCH(HttpStatus.CONFLICT, "동일한 이메일로 다른 방식으로 가입된 계정이 있습니다."),
    OAUTH_TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "유효하지 않은 소셜 로그인 토큰입니다."),
    ;

    private final HttpStatus httpStatus;
    private final String message;

    ErrorCode(HttpStatus httpStatus, String message) {
        this.httpStatus = httpStatus;
        this.message = message;
    }
}
