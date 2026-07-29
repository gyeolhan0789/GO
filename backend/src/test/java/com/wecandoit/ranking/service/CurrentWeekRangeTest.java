package com.wecandoit.ranking.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("현재 주간 범위")
class CurrentWeekRangeTest {

    @Test
    @DisplayName("주중에는 월요일부터 현재 날짜까지를 반환한다")
    void fromReturnsMondayThroughCurrentDate() {
        // given
        LocalDate currentDate = LocalDate.of(2026, 7, 23);

        // when
        CurrentWeekRange range = CurrentWeekRange.from(currentDate);

        // then
        assertThat(range.startDate()).isEqualTo(LocalDate.of(2026, 7, 20));
        assertThat(range.endDate()).isEqualTo(currentDate);
    }

    @Test
    @DisplayName("월요일에는 시작일과 종료일이 모두 현재 날짜다")
    void fromReturnsCurrentDateOnMonday() {
        // given
        LocalDate currentDate = LocalDate.of(2026, 7, 20);

        // when
        CurrentWeekRange range = CurrentWeekRange.from(currentDate);

        // then
        assertThat(range.startDate()).isEqualTo(currentDate);
        assertThat(range.endDate()).isEqualTo(currentDate);
    }
}
