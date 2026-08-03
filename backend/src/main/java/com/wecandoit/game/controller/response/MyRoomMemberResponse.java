package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.member.domain.Gender;
import java.util.List;

public record MyRoomMemberResponse(
        Long memberId,
        String nickname,
        Gender gender,
        String defaultImageUrl,
        List<EquippedItemResponse> equippedItems,
        boolean host
) {

    public static MyRoomMemberResponse from(
            RoomMember roomMember,
            String nickname,
            Gender gender,
            String defaultImageUrl,
            List<EquippedItemResponse> equippedItems,
            boolean host
    ) {
        return new MyRoomMemberResponse(
                roomMember.getMemberId(),
                nickname,
                gender,
                defaultImageUrl,
                equippedItems,
                host
        );
    }
}
