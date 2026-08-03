package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.GameResultParticipant;
import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import java.util.List;

public record GameResultParticipantResponse(
        Long memberId,
        String nickname,
        Gender gender,
        String defaultImageUrl,
        List<EquippedItemResponse> equippedItems,
        int completedMissionCount,
        long rewardPoint,
        Boolean result
) {

    public static GameResultParticipantResponse of(
            GameResultParticipant participant,
            Member member,
            String defaultImageUrl,
            List<EquippedItemResponse> equippedItems
    ) {
        return new GameResultParticipantResponse(
                member.getId(),
                member.getNickname(),
                member.getGender(),
                defaultImageUrl,
                equippedItems,
                participant.getCompletedMissionCount(),
                participant.getRewardPoint(),
                participant.getResult()
        );
    }
}
