package com.wecandoit.member.controller.request;

final class MemberValidationRules {

    static final int NICKNAME_MIN_LENGTH = 2;
    static final int NICKNAME_MAX_LENGTH = 10;
    static final String NICKNAME_LENGTH_MESSAGE = "닉네임은 2자 이상 10자 이하이어야 합니다.";

    static final String PASSWORD_PATTERN = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s]).{8,}$";
    static final String PASSWORD_PATTERN_MESSAGE = "비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다.";

    private MemberValidationRules() {
    }
}
