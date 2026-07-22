package com.wecandoit.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // Common
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "토큰이 만료되었습니다."),
    TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."),
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    REFRESH_TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "유효하지 않은 Refresh Token입니다."),

    // Member
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "회원을 찾을 수 없습니다."),

    // Friend
    SELF_FRIEND_REQUEST(HttpStatus.BAD_REQUEST, "자기 자신에게 친구 요청을 보낼 수 없습니다."),
    ALREADY_FRIENDS(HttpStatus.CONFLICT, "이미 친구인 회원입니다."),
    DUPLICATE_FRIEND_REQUEST(HttpStatus.CONFLICT, "이미 보낸 친구 요청이 존재합니다."),
    REVERSE_FRIEND_REQUEST_EXISTS(HttpStatus.CONFLICT, "상대방이 보낸 친구 요청이 존재합니다."),
    FRIEND_REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "친구 요청을 찾을 수 없습니다."),
    FRIEND_REQUEST_FORBIDDEN(HttpStatus.FORBIDDEN, "친구 요청을 처리할 권한이 없습니다."),
    FRIEND_REQUEST_ALREADY_PROCESSED(HttpStatus.CONFLICT, "이미 처리된 친구 요청입니다."),
    FRIEND_NOT_FOUND(HttpStatus.NOT_FOUND, "친구 관계를 찾을 수 없습니다."),

    // Game Room
    ROOM_NOT_FOUND(HttpStatus.NOT_FOUND, "게임방을 찾을 수 없습니다."),
    ROOM_DELETE_FORBIDDEN(HttpStatus.FORBIDDEN, "게임방 삭제 권한이 없습니다."),

    // Mission
    INVALID_MISSION_TYPE(HttpStatus.BAD_REQUEST, "미션 타입은 OBJECT, ATTRIBUTE, RELATION 중 하나여야 합니다."),

    // Game Request
    GAME_REQUEST_FORBIDDEN(HttpStatus.FORBIDDEN, "게임방 초대 권한이 없습니다."),
    GAME_REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "게임방 초대 요청을 찾을 수 없습니다."),
    GAME_REQUEST_NOT_AVAILABLE(HttpStatus.CONFLICT, "현재 상태에서는 게임방 초대를 보낼 수 없습니다."),
    GAME_REQUEST_SELF_INVITE(HttpStatus.BAD_REQUEST, "자기 자신을 게임방에 초대할 수 없습니다."),
    GAME_REQUEST_ALREADY_ROOM_MEMBER(HttpStatus.CONFLICT, "이미 게임방에 참여 중인 회원입니다."),
    GAME_REQUEST_FRIEND_REQUIRED(HttpStatus.BAD_REQUEST, "친구인 회원만 게임방에 초대할 수 있습니다."),
    GAME_REQUEST_ALREADY_PROCESSED(HttpStatus.CONFLICT, "이미 처리된 게임방 초대 요청입니다."),

    // OAuth
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
