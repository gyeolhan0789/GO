package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.avatar.dto.EquippedItemDto;
import com.wecandoit.member.domain.Gender;
import java.time.LocalDateTime;
import java.util.List;

public record RoomMemberResponse(
        Long memberId,
        String nickname,
        Gender gender,
        String defaultImageUrl,
        List<EquippedItemDto> equippedItems,
        boolean host,
        int completedMissionCount,
        LocalDateTime joinedAt,
        Long bingoBoardId
) {

    public static RoomMemberResponse from(
            RoomMember roomMember,
            String nickname,
            Gender gender,
            String defaultImageUrl,
            List<EquippedItemDto> equippedItems,
            boolean host,
            int completedMissionCount,
            Long bingoBoardId
    ) {
        return new RoomMemberResponse(
                roomMember.getMemberId(),
                nickname,
                gender,
                defaultImageUrl,
                equippedItems,
                host,
                completedMissionCount,
                roomMember.getJoinedAt(),
                bingoBoardId
        );
    }
}
