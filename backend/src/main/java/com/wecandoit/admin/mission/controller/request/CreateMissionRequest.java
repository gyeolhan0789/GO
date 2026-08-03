package com.wecandoit.admin.mission.controller.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateMissionRequest(
        @NotBlank(message = "미션 타입은 필수입니다.")
        String type,

        @Size(max = 255, message = "미션 제목은 255자 이하여야 합니다.")
        String title,

        @Size(max = 255, message = "미션 상세는 255자 이하여야 합니다.")
        String detail,

        String decisionCondition
) {
}
