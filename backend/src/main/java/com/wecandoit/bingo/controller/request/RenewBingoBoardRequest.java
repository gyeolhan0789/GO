package com.wecandoit.bingo.controller.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record RenewBingoBoardRequest(
        @NotNull(message = "빙고판 크기는 필수입니다.")
        @Min(value = 3, message = "빙고판 크기는 3 이상이어야 합니다.")
        @Max(value = 5, message = "빙고판 크기는 5 이하여야 합니다.")
        Integer boardSize,

        @NotNull(message = "목표 걸음 수는 필수입니다.")
        @Min(value = 1, message = "목표 걸음 수는 1 이상이어야 합니다.")
        Integer targetStepCount
) {
}
