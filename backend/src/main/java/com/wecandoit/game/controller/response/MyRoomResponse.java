package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import java.time.LocalDateTime;
import java.util.List;

public record MyRoomResponse(
        Long roomId,
        String name,
        GameMode mode,
        GameRoomStatus status,
        Integer targetBingoCount,
        Integer targetStepCount,
        Long hostId,
        LocalDateTime joinedAt,
        List<MyRoomMemberResponse> members
) {

    public static MyRoomResponse from(
            Room room,
            RoomMember myRoomMember,
            List<MyRoomMemberResponse> members
    ) {
        return new MyRoomResponse(
                room.getId(),
                room.getName(),
                room.getMode(),
                room.getStatus(),
                room.getTargetBingoCount(),
                room.getTargetStepCount(),
                room.getHostId(),
                myRoomMember.getJoinedAt(),
                members
        );
    }
}

