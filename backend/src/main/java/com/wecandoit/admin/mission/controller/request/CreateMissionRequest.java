package com.wecandoit.admin.mission.controller.request;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateMissionRequest(
        @NotBlank(message = "미션 이미지 URL은 필수입니다.")
        @Size(max = 100, message = "미션 이미지 URL은 100자 이하여야 합니다.")
        String missionImageUrl,

        @NotBlank(message = "미션 타입은 필수입니다.")
        String type,

        @Size(max = 255, message = "미션 제목은 255자 이하여야 합니다.")
        String title,

        @Size(max = 255, message = "미션 상세는 255자 이하여야 합니다.")
        String detail,

        JsonNode decisionCondition
) {
}
