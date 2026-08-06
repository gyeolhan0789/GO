package com.wecandoit.avatar.dto;

import com.wecandoit.member.domain.Member;
import com.wecandoit.member.domain.Gender;
import java.util.List;

public record AvatarDto(
        Long memberId,
        String nickname,
        Gender gender,
        String defaultImageUrl,
        List<EquippedItemDto> equippedItems
) {

    public static AvatarDto of(
            Member member,
            String defaultImageUrl,
            List<EquippedItemDto> equippedItems
    ) {
        return new AvatarDto(
                member.getId(),
                member.getNickname(),
                member.getGender(),
                defaultImageUrl,
                equippedItems
        );
    }
}
