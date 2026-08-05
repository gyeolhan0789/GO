package com.wecandoit.member.controller.response;

import com.wecandoit.avatar.dto.EquippedItemDto;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.domain.MemberRelationshipStatus;
import java.util.List;

public record MemberSearchResponse(
        Long memberId,
        String nickname,
        MemberRelationshipStatus relationshipStatus,
        Gender gender,
        String defaultImageUrl,
        List<EquippedItemDto> equippedItems
) {

    public static MemberSearchResponse of(
            Member member,
            MemberRelationshipStatus relationshipStatus,
            String defaultImageUrl,
            List<EquippedItemDto> equippedItems
    ) {
        return new MemberSearchResponse(
                member.getId(),
                member.getNickname(),
                relationshipStatus,
                member.getGender(),
                defaultImageUrl,
                equippedItems
        );
    }
}
