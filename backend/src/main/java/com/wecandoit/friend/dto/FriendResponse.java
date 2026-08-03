package com.wecandoit.friend.dto;

import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import java.util.List;

public record FriendResponse(
        Long memberId,
        String nickname,
        long weeklySteps,
        Gender gender,
        String defaultImageUrl,
        List<EquippedItemResponse> equippedItems
) {

    public static FriendResponse of(
            Member member,
            long weeklySteps,
            String defaultImageUrl,
            List<EquippedItemResponse> equippedItems
    ) {
        return new FriendResponse(
                member.getId(),
                member.getNickname(),
                weeklySteps,
                member.getGender(),
                defaultImageUrl,
                equippedItems
        );
    }
}
