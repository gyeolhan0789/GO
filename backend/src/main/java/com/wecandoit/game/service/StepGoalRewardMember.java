package com.wecandoit.game.service;

import java.time.LocalDate;

public record StepGoalRewardMember(
        Long memberId,
        LocalDate joinedDate
) {
}
