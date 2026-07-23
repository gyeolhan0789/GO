package com.wecandoit.item.controller.response;

import com.wecandoit.member.domain.Member;
import java.util.List;

public record CharacterResponse(
        Long memberId,
        String nickname,
        List<EquippedItemResponse> equippedItems
) {

    public static CharacterResponse of(
            Member member,
            List<EquippedItemResponse> equippedItems
    ) {
        return new CharacterResponse(member.getId(), member.getNickname(), equippedItems);
    }
}
