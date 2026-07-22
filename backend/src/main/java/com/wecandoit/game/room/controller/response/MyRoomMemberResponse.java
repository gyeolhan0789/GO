package com.wecandoit.game.room.controller.response;

import com.wecandoit.game.room.domain.RoomMember;

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
