package com.wecandoit.member.controller.response;

import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.domain.Region;

public record MyPageResponse(
        Long id,
        String email,
        String nickname,
        Gender gender,
        Region region,
        long point
) {

    public static MyPageResponse of(Member member) {
        return new MyPageResponse(
                member.getId(),
                member.getEmail(),
                member.getNickname(),
                member.getGender(),
                member.getRegion(),
                member.getPoint()
        );
    }
}
