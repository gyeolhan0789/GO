package com.wecandoit.game.controller.request;

import com.wecandoit.game.domain.Room;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateRoomNameRequest(
        @NotBlank(message = "게임방 이름은 필수입니다.")
        @Size(max = Room.NAME_MAX_LENGTH, message = "게임방 이름은 20자 이하여야 합니다.")
        String name
) {

    public UpdateRoomNameRequest {
        if (name != null) {
            name = name.strip();
        }
    }
}
