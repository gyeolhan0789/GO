package com.wecandoit.history.service;

import com.wecandoit.history.domain.MemberHistory;
import java.time.LocalDate;

public record StepRecord(
        Long memberId,
        LocalDate historyDate,
        int step
) {

    static StepRecord from(MemberHistory memberHistory) {
        return new StepRecord(
                memberHistory.getMemberId(),
                memberHistory.getHistoryDate(),
                memberHistory.getStep()
        );
    }
}
