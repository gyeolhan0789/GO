package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.GameResultParticipant;
import com.wecandoit.member.domain.Member;

public record GameResultParticipantResponse(
        Long memberId,
        String nickname,
        int completedMissionCount,
        long rewardCash
) {

    public static GameResultParticipantResponse of(GameResultParticipant participant, Member member) {
        return new GameResultParticipantResponse(
                member.getId(),
                member.getNickname(),
                participant.getCompletedMissionCount(),
                participant.getRewardCash()
        );
    }
}
