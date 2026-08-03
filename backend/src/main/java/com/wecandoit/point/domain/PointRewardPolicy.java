package com.wecandoit.point.domain;

import com.wecandoit.mission.domain.MissionType;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PointRewardPolicy {

    GAME_GOAL(200L),
    BATTLE_WINNER_GAME_GOAL(300L),
    BATTLE_LOSER_GAME_GOAL(50L),
    DAILY_STEP_GOAL(100L),
    BINGO_CELL_OBJECT(30L),
    BINGO_CELL_ATTRIBUTE(50L),
    BINGO_CELL_RELATION(70L),
    BINGO_CELL_ORDINARY(30L);

    private final long point;

    public static long getBingoCellRewardPoint(MissionType missionType) {
        return switch (missionType) {
            case OBJECT -> BINGO_CELL_OBJECT.point;
            case ATTRIBUTE -> BINGO_CELL_ATTRIBUTE.point;
            case RELATION -> BINGO_CELL_RELATION.point;
            case ORDINARY,
                 STEP_TOTAL,
                 STEP_CONTINUOUS,
                 STEP_UPHILL,
                 STEP_DAILY,
                 WALKING_TIME_TOTAL,
                 WALKING_TIME_CONTINUOUS,
                 STEADY_PACE,
                 DISTANCE_TOTAL,
                 CALORIES_TOTAL,
                 AVERAGE_SPEED -> BINGO_CELL_ORDINARY.point;
        };
    }
}
