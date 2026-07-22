package com.wecandoit.mission.domain;

import java.util.Arrays;

public enum MissionType {
    OBJECT,
    ATTRIBUTE,
    RELATION;

    public static boolean contains(String type) {
        return Arrays.stream(values())
                .anyMatch(missionType -> missionType.name().equals(type));
    }
}
