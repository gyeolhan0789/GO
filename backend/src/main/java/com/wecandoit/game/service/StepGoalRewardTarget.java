package com.wecandoit.game.service;

import java.time.LocalDate;
import java.util.List;

public record StepGoalRewardTarget(
        Long roomId,
        Long bingoBoardId,
        LocalDate boardStartedDate,
        int targetStepCount,
        List<StepGoalRewardMember> members
) {
}
