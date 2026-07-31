package com.wecandoit.game.controller.response;

import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomStatus;

public record CreateRoomResponse(
        // TODO: Add response fields after the room creation spec is confirmed.
        Long roomId,
        RoomStatus status
) {

    public static CreateRoomResponse from(Room room) {
        return new CreateRoomResponse(room.getId(), room.getStatus());
    }
}
