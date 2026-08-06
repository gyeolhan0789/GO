package com.wecandoit.game.service;
import java.util.List;

public record StepGoalRewardTarget(
        Long roomId,
        Long bingoBoardId,
        int targetStepCount,
        List<StepGoalRewardMember> members
) {
}
