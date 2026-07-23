package com.wecandoit.bingo.controller.request;

import jakarta.validation.constraints.NotBlank;

public record SubmitBingoCellRequest(
        @NotBlank(message = "제출 URL은 필수입니다.")
        String submitUrl
) {
}
