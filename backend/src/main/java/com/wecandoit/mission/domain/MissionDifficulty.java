package com.wecandoit.mission.domain;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import java.util.Arrays;

public enum MissionDifficulty {
    LOW,
    MEDIUM,
    HIGH;

    public static boolean contains(String difficulty) {
        return Arrays.stream(values())
                .anyMatch(missionDifficulty -> missionDifficulty.name().equals(difficulty));
    }

    public static MissionDifficulty from(String difficulty) {
        return Arrays.stream(values())
                .filter(missionDifficulty -> missionDifficulty.name().equals(difficulty))
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_MISSION_DIFFICULTY));
    }
}
