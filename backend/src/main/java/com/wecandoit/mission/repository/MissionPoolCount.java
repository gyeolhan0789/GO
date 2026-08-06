package com.wecandoit.mission.repository;

import com.wecandoit.mission.domain.MissionDifficulty;
import com.wecandoit.mission.domain.MissionType;

/**
 * Number of active missions sharing the same type and difficulty.
 */
public record MissionPoolCount(MissionType type, MissionDifficulty difficulty, long count) {
}
