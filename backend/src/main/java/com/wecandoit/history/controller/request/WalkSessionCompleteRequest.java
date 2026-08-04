package com.wecandoit.history.controller.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.OffsetDateTime;
import java.util.UUID;

public record WalkSessionCompleteRequest(
        UUID walkSessionKey,

        UUID clientSessionKey,

        Long roomId,

        Long bingoBoardId,

        OffsetDateTime startedAt,

        @NotNull(message = "산책 종료 시각은 필수입니다.")
        OffsetDateTime endedAt,

        @PositiveOrZero(message = "실제 운동 시간은 0 이상이어야 합니다.")
        Long activeDurationSeconds,

        @PositiveOrZero(message = "걸음 수는 0 이상이어야 합니다.")
        int step,

        @PositiveOrZero(message = "거리는 0 이상이어야 합니다.")
        int distance,

        @PositiveOrZero(message = "칼로리는 0 이상이어야 합니다.")
        int calories
) {

    public UUID resolvedWalkSessionKey() {
        return walkSessionKey == null ? clientSessionKey : walkSessionKey;
    }
}
