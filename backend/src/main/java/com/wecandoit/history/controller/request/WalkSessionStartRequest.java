package com.wecandoit.history.controller.request;

import jakarta.validation.constraints.NotNull;

public record WalkSessionStartRequest(
        @NotNull(message = "산책방 ID는 필수입니다.")
        Long roomId,

        Long bingoBoardId
) {
}
