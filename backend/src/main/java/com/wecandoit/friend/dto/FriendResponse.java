package com.wecandoit.friend.dto;

import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.member.domain.Member;
import java.util.List;

public record FriendResponse(
        Long memberId,
        String nickname,
        long weeklySteps,
        List<EquippedItemResponse> equippedItems
) {

    public static FriendResponse of(
            Member member,
            long weeklySteps,
            List<EquippedItemResponse> equippedItems
    ) {
        return new FriendResponse(
                member.getId(),
                member.getNickname(),
                weeklySteps,
                equippedItems
        );
    }
}
