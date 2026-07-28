package com.wecandoit.history.controller.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record HistorySaveRequest(
        // TODO: 프론트 날짜 포맷 확정 필요. 현재는 Spring 기본 ISO-8601 yyyy-MM-dd 기준입니다.
        @NotNull(message = "히스토리 날짜는 필수입니다.")
        LocalDate historyDate,

        @Min(value = 0, message = "걸음 수는 0 이상이어야 합니다.")
        int step,

        @Min(value = 0, message = "거리는 0 이상이어야 합니다.")
        int distance,

        @Min(value = 0, message = "칼로리는 0 이상이어야 합니다.")
        int calories
) {
}
