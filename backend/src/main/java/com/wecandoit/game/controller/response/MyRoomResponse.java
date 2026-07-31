package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.domain.RoomStatus;
import java.time.LocalDateTime;
import java.util.List;

public record MyRoomResponse(
        Long roomId,
        String name,
        GameMode mode,
        RoomStatus status,
        int boardSize,
        Integer targetBingoCount,
        Integer targetStepCount,
        int totalMissionCount,
        int completedMissionCount,
        Long hostId,
        LocalDateTime joinedAt,
        List<MyRoomMemberResponse> members
) {

    public static MyRoomResponse from(
            Room room,
            RoomMember myRoomMember,
            int boardSize,
            Integer targetBingoCount,
            Integer targetStepCount,
            int totalMissionCount,
            int completedMissionCount,
            List<MyRoomMemberResponse> members
    ) {
        return new MyRoomResponse(
                room.getId(),
                room.getName(),
                room.getMode(),
                room.getStatus(),
                boardSize,
                targetBingoCount,
                targetStepCount,
                totalMissionCount,
                completedMissionCount,
                room.getHostId(),
                myRoomMember.getJoinedAt(),
                members
        );
    }
}

