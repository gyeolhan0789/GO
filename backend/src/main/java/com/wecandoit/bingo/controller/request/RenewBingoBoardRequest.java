package com.wecandoit.bingo.controller.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record RenewBingoBoardRequest(
        @NotNull(message = "목표 걸음 수는 필수입니다.")
        @Min(value = 1, message = "목표 걸음 수는 1 이상이어야 합니다.")
        Integer targetStepCount
) {
}
