package com.wecandoit.backend.friend.dto;

import com.wecandoit.backend.domain.member.Member;

public record FriendResponse(Long memberId, String nickname) {

    public static FriendResponse from(Member member) {
        return new FriendResponse(member.getId(), member.getNickname());
    }
}
