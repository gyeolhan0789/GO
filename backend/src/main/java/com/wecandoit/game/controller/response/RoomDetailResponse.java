package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.Room;
import java.time.LocalDateTime;
import java.util.List;

public record RoomDetailResponse(
        Long roomId,
        GameMode mode,
        GameRoomStatus status,
        Integer targetBingoCount,
        Integer targetStepCount,
        Long hostId,
        LocalDateTime startedAt,
        List<RoomMemberResponse> members
) {

    public static RoomDetailResponse from(
            Room room,
            List<RoomMemberResponse> members
    ) {
        return new RoomDetailResponse(
                room.getId(),
                room.getMode(),
                room.getStatus(),
                room.getTargetBingoCount(),
                room.getTargetStepCount(),
                room.getHostId(),
                room.getStartedAt(),
                members
        );
    }
}
