package com.wecandoit.game.controller.request;

import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.Room;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateRoomRequest(
        @NotBlank(message = "게임방 이름은 필수입니다.")
        @Size(max = Room.NAME_MAX_LENGTH, message = "게임방 이름은 20자 이하여야 합니다.")
        String name,

        @NotNull(message = "게임 모드는 필수입니다.")
        GameMode mode,

        @NotNull(message = "목표 빙고 수는 필수입니다.")
        @Min(value = 1, message = "목표 빙고 수는 1 이상이어야 합니다.")
        Integer targetBingoCount,

        @Min(value = 1, message = "목표 걸음 수는 1 이상이어야 합니다.")
        Integer targetStepCount,

        @NotNull(message = "빙고판 크기는 필수입니다.")
        @Min(value = 3, message = "빙고판 크기는 3 이상 5 이하여야 합니다.")
        @Max(value = 5, message = "빙고판 크기는 3 이상 5 이하여야 합니다.")
        Integer boardSize
) {

    public CreateRoomRequest {
        if (name != null) {
            name = name.strip();
        }
    }
}
