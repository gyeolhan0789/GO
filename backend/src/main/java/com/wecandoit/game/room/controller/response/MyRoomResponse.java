package com.wecandoit.game.room.controller.response;

import com.wecandoit.game.room.domain.GameMode;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.domain.RoomMember;
import java.time.LocalDateTime;
import java.util.List;

public record MyRoomResponse(
        Long roomId,
        GameMode mode,
        GameRoomStatus status,
        int targetBingoCount,
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
                room.getMode(),
                room.getStatus(),
                room.getTargetBingoCount(),
                room.getHostId(),
                myRoomMember.getJoinedAt(),
                members
        );
    }
}
