package com.wecandoit.mission.controller.response;

import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionType;
import com.wecandoit.point.domain.PointRewardPolicy;
import java.time.LocalDateTime;

public record MissionResponse(
        Long missionId,
        String missionImageUrl,
        MissionType type,
        String title,
        String detail,
        String decisionCondition,
        long point,
        LocalDateTime createdAt
) {

    public static MissionResponse from(Mission mission) {
        return new MissionResponse(
                mission.getId(),
                mission.getMissionImageUrl(),
                mission.getType(),
                mission.getTitle(),
                mission.getDetail(),
                mission.getDecisionCondition(),
                PointRewardPolicy.getBingoCellRewardPoint(mission.getDifficulty()),
                mission.getCreatedAt()
        );
    }
}
