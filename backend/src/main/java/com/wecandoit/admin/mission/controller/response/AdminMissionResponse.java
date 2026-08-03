package com.wecandoit.admin.mission.controller.response;

import com.wecandoit.mission.domain.Mission;
import java.time.LocalDateTime;

public record AdminMissionResponse(
        Long missionId,
        String missionImageUrl,
        String type,
        String title,
        String detail,
        String decisionCondition,
        boolean isActive,
        LocalDateTime createdAt
) {

    public static AdminMissionResponse from(Mission mission) {
        return new AdminMissionResponse(
                mission.getId(),
                mission.getMissionImageUrl(),
                mission.getType(),
                mission.getTitle(),
                mission.getDetail(),
                mission.getDecisionCondition(),
                mission.isActive(),
                mission.getCreatedAt()
        );
    }
}
