package com.wecandoit.game.room.controller.request;

import com.wecandoit.game.room.domain.GameMode;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CreateRoomRequest(
        // TODO: Add request fields after the room creation spec is confirmed.
        @NotNull(message = "Game mode is required.")
        GameMode mode,

        @NotNull(message = "Target bingo count is required.")
        @Min(value = 1, message = "Target bingo count must be at least 1.")
        Integer targetBingoCount
) {
}
