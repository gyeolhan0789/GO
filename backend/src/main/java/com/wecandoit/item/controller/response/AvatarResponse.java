package com.wecandoit.item.controller.response;

import com.wecandoit.member.domain.Member;
import com.wecandoit.member.domain.Gender;
import java.util.List;

public record AvatarResponse(
        Long memberId,
        String nickname,
        Gender gender,
        String defaultImageUrl,
        List<EquippedItemResponse> equippedItems
) {

    public static AvatarResponse of(
            Member member,
            String defaultImageUrl,
            List<EquippedItemResponse> equippedItems
    ) {
        return new AvatarResponse(
                member.getId(),
                member.getNickname(),
                member.getGender(),
                defaultImageUrl,
                equippedItems
        );
    }
}
