package com.wecandoit.friend.dto;

import com.wecandoit.member.domain.Member;

public record FriendResponse(Long memberId, String nickname) {

    public static FriendResponse from(Member member) {
        return new FriendResponse(member.getId(), member.getNickname());
    }
}
