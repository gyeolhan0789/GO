package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.Room;

public record CreateRoomResponse(
        // TODO: Add response fields after the room creation spec is confirmed.
        Long roomId,
        GameRoomStatus status,
        Integer targetStepCount
) {

    public static CreateRoomResponse from(Room room) {
        return new CreateRoomResponse(room.getId(), room.getStatus(), room.getTargetStepCount());
    }
}
