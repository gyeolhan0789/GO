package com.wecandoit.mission.domain;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import java.util.Arrays;

public enum MissionType {
    OBJECT,
    ATTRIBUTE,
    RELATION,
    ORDINARY;

    public static boolean contains(String type) {
        return Arrays.stream(values())
                .anyMatch(missionType -> missionType.name().equals(type));
    }

    public static MissionType from(String type) {
        return Arrays.stream(values())
                .filter(missionType -> missionType.name().equals(type))
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_MISSION_TYPE));
    }
}
