package com.wecandoit.member.dto;

import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import java.util.List;

public record MemberSearchResponse(
        Long memberId,
        String nickname,
        MemberRelationshipStatus relationshipStatus,
        Gender gender,
        String defaultImageUrl,
        List<EquippedItemResponse> equippedItems
) {

    public static MemberSearchResponse of(
            Member member,
            MemberRelationshipStatus relationshipStatus,
            String defaultImageUrl,
            List<EquippedItemResponse> equippedItems
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
