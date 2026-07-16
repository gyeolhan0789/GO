package com.wecandoit.backend.domain.member.dto;

import com.wecandoit.backend.domain.member.Member;

public record SignupResponse(Long id, String email, String nickname) {

    public static SignupResponse from(Member member) {
        return new SignupResponse(member.getId(), member.getEmail(), member.getNickname());
    }
}
