package com.wecandoit.history.controller.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.OffsetDateTime;
import java.util.UUID;

public record WalkSessionCompleteRequest(
        @NotNull(message = "클라이언트 세션 키는 필수입니다.")
        UUID clientSessionKey,

        @NotNull(message = "산책방 ID는 필수입니다.")
        Long roomId,

        Long bingoBoardId,

        @NotNull(message = "산책 시작 시각은 필수입니다.")
        OffsetDateTime startedAt,

        @NotNull(message = "산책 종료 시각은 필수입니다.")
        OffsetDateTime endedAt,

        @PositiveOrZero(message = "걸음 수는 0 이상이어야 합니다.")
        int step,

        @PositiveOrZero(message = "거리는 0 이상이어야 합니다.")
        int distance,

        @PositiveOrZero(message = "칼로리는 0 이상이어야 합니다.")
        int calories
) {
}
