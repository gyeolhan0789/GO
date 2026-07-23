package com.wecandoit.history.controller.response;

import com.wecandoit.history.domain.MemberHistory;
import java.time.LocalDate;

public record HistoryDateResponse(
        LocalDate historyDate,
        int step,
        int distance,
        int calories
) {

    public static HistoryDateResponse from(MemberHistory memberHistory) {
        return new HistoryDateResponse(
                memberHistory.getHistoryDate(),
                memberHistory.getStep(),
                memberHistory.getDistance(),
                memberHistory.getCalories()
        );
    }

    public static HistoryDateResponse empty(LocalDate historyDate) {
        return new HistoryDateResponse(historyDate, 0, 0, 0);
    }
}
