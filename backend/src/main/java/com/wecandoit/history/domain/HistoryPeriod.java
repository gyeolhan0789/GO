package com.wecandoit.history.domain;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

public enum HistoryPeriod {

    DAY,
    WEEK,
    MONTH;

    public LocalDate getStartDate(LocalDate date) {
        return switch (this) {
            case DAY -> date;
            case WEEK -> date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case MONTH -> date.withDayOfMonth(1);
        };
    }

    public LocalDate getEndDate(LocalDate date) {
        return switch (this) {
            case DAY -> date;
            case WEEK -> date.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
            case MONTH -> date.withDayOfMonth(date.lengthOfMonth());
        };
    }
}
