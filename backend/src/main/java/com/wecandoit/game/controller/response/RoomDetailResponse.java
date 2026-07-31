package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomStatus;
import java.time.LocalDateTime;
import java.util.List;

public record RoomDetailResponse(
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
        LocalDateTime startedAt,
        List<RoomMemberResponse> members
) {

    public static RoomDetailResponse from(
            Room room,
            int boardSize,
            Integer targetBingoCount,
            Integer targetStepCount,
            int totalMissionCount,
            int completedMissionCount,
            LocalDateTime startedAt,
            List<RoomMemberResponse> members
    ) {
        return new RoomDetailResponse(
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
                startedAt,
                members
        );
    }
}
