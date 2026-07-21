package com.wecandoit.member.dto;

import com.wecandoit.member.domain.Member;

public record MemberSearchResponse(
        Long memberId,
        String nickname,
        MemberRelationshipStatus relationshipStatus
) {

    public static MemberSearchResponse of(Member member, MemberRelationshipStatus relationshipStatus) {
        return new MemberSearchResponse(member.getId(), member.getNickname(), relationshipStatus);
    }
}
