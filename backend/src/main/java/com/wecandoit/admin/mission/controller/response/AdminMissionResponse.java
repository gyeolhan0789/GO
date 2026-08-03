package com.wecandoit.admin.mission.controller.response;

import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionDifficulty;
import com.wecandoit.mission.domain.MissionType;
import java.time.LocalDateTime;

public record AdminMissionResponse(
        Long missionId,
        String missionImageUrl,
        MissionType type,
        MissionDifficulty difficulty,
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
                mission.getDifficulty(),
                mission.getTitle(),
                mission.getDetail(),
                mission.getDecisionCondition(),
                mission.isActive(),
                mission.getCreatedAt()
        );
    }
}
