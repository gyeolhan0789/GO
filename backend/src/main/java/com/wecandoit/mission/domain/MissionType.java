package com.wecandoit.mission.domain;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import java.util.Arrays;

public enum MissionType {
    OBJECT,
    ATTRIBUTE,
    RELATION,
    ORDINARY,
    STEP_TOTAL,
    STEP_CONTINUOUS,
    STEP_UPHILL,
    STEP_DAILY,
    WALKING_TIME_TOTAL,
    WALKING_TIME_CONTINUOUS,
    STEADY_PACE,
    DISTANCE_TOTAL,
    CALORIES_TOTAL,
    AVERAGE_SPEED;

    public static MissionType from(String type) {
        return Arrays.stream(values())
                .filter(missionType -> missionType.name().equals(type))
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_MISSION_TYPE));
    }
}
