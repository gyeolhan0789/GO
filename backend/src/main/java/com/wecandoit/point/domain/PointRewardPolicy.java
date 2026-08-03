package com.wecandoit.point.domain;

import com.wecandoit.mission.domain.MissionDifficulty;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PointRewardPolicy {

    GAME_GOAL(200L),
    BATTLE_WINNER_GAME_GOAL(300L),
    BATTLE_LOSER_GAME_GOAL(50L),
    DAILY_STEP_GOAL(100L),
    BINGO_CELL_LOW(30L),
    BINGO_CELL_MEDIUM(50L),
    BINGO_CELL_HIGH(70L);

    private final long point;

    public static long getBingoCellRewardPoint(MissionDifficulty missionDifficulty) {
        return switch (missionDifficulty) {
            case LOW -> BINGO_CELL_LOW.point;
            case MEDIUM -> BINGO_CELL_MEDIUM.point;
            case HIGH -> BINGO_CELL_HIGH.point;
        };
    }
}
