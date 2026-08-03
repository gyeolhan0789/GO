package com.wecandoit.bingo.domain;

import java.util.List;

public enum BingoBoardStatus {
    ACTIVE,
    COMPLETED,
    EXPIRED;

    private static final List<BingoBoardStatus> INACTIVE_STATUSES = List.of(COMPLETED, EXPIRED);

    public static List<BingoBoardStatus> inactiveStatuses() {
        return INACTIVE_STATUSES;
    }
}
