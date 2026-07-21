package com.wecandoit.backend.domain.member.dto;

import com.wecandoit.backend.domain.member.Member;

public record MemberSearchResponse(
        Long memberId,
        String nickname,
        MemberRelationshipStatus relationshipStatus
) {

    public static MemberSearchResponse of(Member member, MemberRelationshipStatus relationshipStatus) {
        return new MemberSearchResponse(member.getId(), member.getNickname(), relationshipStatus);
    }
}
