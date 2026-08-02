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
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다."),

    // Member
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "회원을 찾을 수 없습니다."),
    DUPLICATE_NICKNAME(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다."),
    INVALID_PASSWORD(HttpStatus.UNAUTHORIZED, "현재 비밀번호가 올바르지 않습니다."),
    INVALID_PROVIDER(HttpStatus.BAD_REQUEST, "소셜 로그인 계정은 비밀번호를 변경할 수 없습니다."),
    MEMBER_REGION_NOT_SET(HttpStatus.BAD_REQUEST, "지역을 설정해야 랭킹을 확인할 수 있습니다."),

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
    ROOM_UPDATE_FORBIDDEN(HttpStatus.FORBIDDEN, "게임방 수정 권한이 없습니다."),
    ROOM_DELETE_FORBIDDEN(HttpStatus.FORBIDDEN, "게임방 삭제 권한이 없습니다."),
    ROOM_MEMBER_FORBIDDEN(HttpStatus.FORBIDDEN, "게임방 참여자만 접근할 수 있습니다."),
    ROOM_CLOSED(HttpStatus.CONFLICT, "종료된 게임방은 처리할 수 없습니다."),
    ROOM_START_FORBIDDEN(HttpStatus.FORBIDDEN, "게임 시작 권한이 없습니다."),
    ROOM_MINIMUM_PARTICIPANTS_REQUIRED(HttpStatus.CONFLICT, "게임 시작에 필요한 최소 인원이 충족되지 않았습니다."),
    ROOM_MAXIMUM_PARTICIPANTS_REACHED(HttpStatus.CONFLICT, "게임방 최대 인원에 도달했습니다."),
    ROOM_NOT_READY(HttpStatus.CONFLICT, "READY 상태의 방에서만 게임을 시작할 수 있습니다."),
    ROOM_TARGET_BINGO_COUNT_REQUIRED(HttpStatus.BAD_REQUEST, "목표 빙고 수는 필수입니다."),
    ROOM_TARGET_STEP_COUNT_REQUIRED(HttpStatus.BAD_REQUEST, "싱글 및 협동 모드에서는 1 이상의 목표 걸음 수가 필수입니다."),
    ROOM_TARGET_STEP_COUNT_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "대결 모드에서는 목표 걸음 수를 설정할 수 없습니다."),
    ROOM_CYCLE_INVALID(HttpStatus.CONFLICT, "활성 게임방의 회차 상태가 올바르지 않습니다."),
    GAME_NOT_FOUND(HttpStatus.NOT_FOUND, "게임을 찾을 수 없습니다."),
    GAME_NOT_COMPLETED(HttpStatus.CONFLICT, "완료되지 않은 게임입니다."),
    GAME_RESULT_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 생성된 게임 결과입니다."),

    GAME_PARTICIPANT_NOT_FOUND(HttpStatus.NOT_FOUND, "게임 참가자를 찾을 수 없습니다."),

    // Mission
    INVALID_MISSION_TYPE(HttpStatus.BAD_REQUEST, "미션 타입은 OBJECT, ATTRIBUTE, RELATION, ORDINARY 중 하나여야 합니다."),
    MISSION_NOT_FOUND(HttpStatus.NOT_FOUND, "미션을 찾을 수 없습니다."),

    // Item
    ITEM_NOT_FOUND(HttpStatus.NOT_FOUND, "아이템을 찾을 수 없습니다."),
    DEFAULT_CHARACTER_ASSET_NOT_FOUND(HttpStatus.NOT_FOUND, "기본 캐릭터 에셋을 찾을 수 없습니다."),
    INVALID_ITEM_CATEGORY(HttpStatus.BAD_REQUEST, "유효하지 않은 아이템 카테고리입니다."),
    DUPLICATE_ITEM_CATEGORY(HttpStatus.BAD_REQUEST, "같은 카테고리의 아이템을 중복 장착할 수 없습니다."),
    ITEM_ALREADY_OWNED(HttpStatus.CONFLICT, "이미 보유한 아이템입니다."),
    ITEM_NOT_AVAILABLE_FOR_SALE(HttpStatus.CONFLICT, "판매 중지된 아이템은 구매할 수 없습니다."),
    INSUFFICIENT_CASH(HttpStatus.BAD_REQUEST, "캐시가 부족합니다."),

    // Bingo Board
    BINGO_BOARD_GENERATE_FORBIDDEN(HttpStatus.FORBIDDEN, "빙고판 생성 권한이 없습니다."),
    ROOM_NOT_IN_PROGRESS(HttpStatus.CONFLICT, "게임이 시작된 방에서만 빙고판을 생성할 수 있습니다."),
    BINGO_BOARD_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 빙고판이 생성된 게임방입니다."),
    MISSION_POOL_INSUFFICIENT(HttpStatus.CONFLICT, "빙고판을 채울 미션이 부족합니다."),
    BINGO_BOARD_NOT_FOUND(HttpStatus.NOT_FOUND, "활성화된 빙고판이 없습니다."),
    BINGO_BOARD_RENEWAL_FORBIDDEN(HttpStatus.FORBIDDEN, "빙고판 갱신 권한이 없습니다."),
    BINGO_BOARD_NOT_COMPLETED(HttpStatus.CONFLICT, "빙고판이 아직 100% 완료되지 않았습니다."),
    BINGO_BOARD_RENEWAL_REQUIRED(HttpStatus.CONFLICT, "빙고판 갱신이 필요합니다."),
    BINGO_CELL_NOT_FOUND(HttpStatus.NOT_FOUND, "해당 칸을 찾을 수 없습니다."),
    BINGO_CELL_VERIFICATION_IN_PROGRESS(HttpStatus.CONFLICT, "이미 검증 중인 빙고 칸입니다."),
    BINGO_CELL_ALREADY_APPROVED(HttpStatus.CONFLICT, "이미 승인된 빙고 칸입니다."),

    BINGO_BOARD_SIZE_INVALID(HttpStatus.BAD_REQUEST, "빙고판 크기는 3 이상 5 이하여야 합니다."),
    BINGO_TARGET_COUNT_INVALID(HttpStatus.BAD_REQUEST, "목표 빙고 수가 빙고판 크기에 맞지 않습니다."),

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
    OAUTH_SIGNUP_TOKEN_INVALID(HttpStatus.BAD_REQUEST, "유효하지 않거나 만료된 가입 토큰입니다."),
    OAUTH_ALREADY_REGISTERED(HttpStatus.CONFLICT, "이미 가입된 이메일입니다."),

    // AI Verification
    AI_VERIFICATION_REQUEST_INVALID(HttpStatus.BAD_GATEWAY, "AI 검증 요청이 올바르지 않습니다."),
    AI_VERIFICATION_SERVER_ERROR(HttpStatus.BAD_GATEWAY, "AI 검증 서버에서 오류가 발생했습니다."),
    AI_VERIFICATION_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "AI 검증 서버 호출에 실패했습니다."),

    // Notification
    NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."),
    NOTIFICATION_ACCESS_FORBIDDEN(HttpStatus.FORBIDDEN, "본인의 알림만 처리할 수 있습니다."),

    // Image Upload
    INVALID_IMAGE_TYPE(HttpStatus.BAD_REQUEST, "이미지 파일 형식은 JPEG 또는 PNG만 지원합니다."),
    IMAGE_TOO_LARGE(HttpStatus.BAD_REQUEST, "이미지 파일 크기는 5MB를 초과할 수 없습니다."),
    ;

    private final HttpStatus httpStatus;
    private final String message;

    ErrorCode(HttpStatus httpStatus, String message) {
        this.httpStatus = httpStatus;
        this.message = message;
    }
}
