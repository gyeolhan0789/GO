package com.wecandoit.game.controller.response;

import com.wecandoit.member.domain.Member;

public record GameResultBoardOwnerResponse(
        Long memberId,
        String nickname
) {

    public static GameResultBoardOwnerResponse from(Member member) {
        return new GameResultBoardOwnerResponse(
                member.getId(),
                member.getNickname()
        );
    }
}
