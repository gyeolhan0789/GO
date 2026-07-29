package com.wecandoit.cash.domain;

import com.wecandoit.mission.domain.MissionType;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CashRewardPolicy {

    GAME_GOAL(200L),
    BATTLE_WINNER_GAME_GOAL(300L),
    BATTLE_LOSER_GAME_GOAL(50L),
    DAILY_STEP_GOAL(100L),
    BINGO_CELL_OBJECT(30L),
    BINGO_CELL_ATTRIBUTE(50L),
    BINGO_CELL_RELATION(70L);

    private final long point;

    public static long getBingoCellRewardPoint(MissionType missionType) {
        return switch (missionType) {
            case OBJECT -> BINGO_CELL_OBJECT.point;
            case ATTRIBUTE -> BINGO_CELL_ATTRIBUTE.point;
            case RELATION -> BINGO_CELL_RELATION.point;
        };
    }
}
