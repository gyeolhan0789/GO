package com.wecandoit.game.room.controller.response;

import com.wecandoit.game.room.domain.RoomMember;
import java.time.LocalDateTime;

public record RoomMemberResponse(
        Long memberId,
        String nickname,
        boolean host,
        int completedMissionCount,
        LocalDateTime joinedAt
) {

    public static RoomMemberResponse from(
            RoomMember roomMember,
            String nickname,
            boolean host
    ) {
        return new RoomMemberResponse(
                roomMember.getMemberId(),
                nickname,
                host,
                roomMember.getCompletedMissionCount(),
                roomMember.getJoinedAt()
        );
    }
}
