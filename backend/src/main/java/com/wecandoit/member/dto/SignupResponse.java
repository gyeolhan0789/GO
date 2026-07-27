package com.wecandoit.member.dto;

import com.wecandoit.member.domain.Member;
import com.wecandoit.member.domain.Gender;

public record SignupResponse(Long id, String email, String nickname, Gender gender) {

    public static SignupResponse from(Member member) {
        return new SignupResponse(member.getId(), member.getEmail(), member.getNickname(), member.getGender());
    }
}
