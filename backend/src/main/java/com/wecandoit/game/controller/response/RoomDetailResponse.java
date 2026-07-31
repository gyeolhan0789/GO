package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.Room;
import java.time.LocalDateTime;
import java.util.List;

public record RoomDetailResponse(
        Long roomId,
        String name,
        GameMode mode,
        GameRoomStatus status,
        Integer targetBingoCount,
        Integer targetStepCount,
        int totalMissionCount,
        int completedMissionCount,
        Long hostId,
        LocalDateTime startedAt,
        List<RoomMemberResponse> members
) {

    public static RoomDetailResponse from(
            Room room,
            int totalMissionCount,
            int completedMissionCount,
            List<RoomMemberResponse> members
    ) {
        return new RoomDetailResponse(
                room.getId(),
                room.getName(),
                room.getMode(),
                room.getStatus(),
                room.getTargetBingoCount(),
                room.getTargetStepCount(),
                totalMissionCount,
                completedMissionCount,
                room.getHostId(),
                room.getStartedAt(),
                members
        );
    }
}
