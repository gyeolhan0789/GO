package com.wecandoit.game.room.controller.response;

import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.Room;

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
