package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.RoomMember;
import java.time.LocalDateTime;

public record RoomMemberResponse(
        Long memberId,
        String nickname,
        boolean host,
        int completedMissionCount,
        LocalDateTime joinedAt,
        Long bingoBoardId
) {

    public static RoomMemberResponse from(
            RoomMember roomMember,
            String nickname,
            boolean host,
            int completedMissionCount,
            Long bingoBoardId
    ) {
        return new RoomMemberResponse(
                roomMember.getMemberId(),
                nickname,
                host,
                completedMissionCount,
                roomMember.getJoinedAt(),
                bingoBoardId
        );
    }
}
