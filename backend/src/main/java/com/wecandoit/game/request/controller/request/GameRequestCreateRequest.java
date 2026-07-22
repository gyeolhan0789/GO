package com.wecandoit.game.request.controller.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record GameRequestCreateRequest(
        @NotNull(message = "초대할 회원 ID는 필수입니다.")
        @Positive(message = "초대할 회원 ID는 양수여야 합니다.")
        Long inviteeId
) {
}
