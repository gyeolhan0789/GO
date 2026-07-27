package com.wecandoit.ranking.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

record CurrentWeekRange(LocalDate startDate, LocalDate endDate) {

    static CurrentWeekRange from(LocalDate currentDate) {
        LocalDate startDate = currentDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return new CurrentWeekRange(startDate, currentDate);
    }
}
