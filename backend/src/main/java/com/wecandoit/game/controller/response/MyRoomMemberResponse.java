package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.RoomMember;

public record MyRoomMemberResponse(
        Long memberId,
        String nickname,
        boolean host
) {

    public static MyRoomMemberResponse from(
            RoomMember roomMember,
            String nickname,
            boolean host
    ) {
        return new MyRoomMemberResponse(
                roomMember.getMemberId(),
                nickname,
                host
        );
    }
}
