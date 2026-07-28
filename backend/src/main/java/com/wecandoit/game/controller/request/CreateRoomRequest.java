package com.wecandoit.game.controller.request;

import com.wecandoit.game.domain.GameMode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CreateRoomRequest(
        @NotNull(message = "게임 모드는 필수입니다.")
        GameMode mode,

        @Min(value = 1, message = "목표 빙고 수는 1 이상이어야 합니다.")
        Integer targetBingoCount,

        @NotNull(message = "빙고판 크기는 필수입니다.")
        @Min(value = 3, message = "빙고판 크기는 3 이상 5 이하여야 합니다.")
        @Max(value = 5, message = "빙고판 크기는 3 이상 5 이하여야 합니다.")
        Integer boardSize
) {
}
