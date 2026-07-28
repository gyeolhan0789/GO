package com.wecandoit.history.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.wecandoit.history.controller.response.HistoryResponse;
import com.wecandoit.history.domain.HistoryPeriod;
import com.wecandoit.history.domain.MemberHistory;
import com.wecandoit.history.repository.MemberHistoryRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@DisplayName("히스토리 조회 서비스")
@ExtendWith(MockitoExtension.class)
class HistoryReadServiceTest {

    @Mock
    private MemberHistoryRepository memberHistoryRepository;
    @InjectMocks
    private HistoryReadService historyReadService;

    @Test
    @DisplayName("하루 히스토리는 기준 날짜 하루만 반환한다")
    void getHistoriesReturnsDayHistory() {
        // given
        LocalDate date = LocalDate.of(2026, 7, 23);
        given(memberHistoryRepository.findAllByMemberIdAndHistoryDateBetweenOrderByHistoryDateAsc(1L, date, date))
                .willReturn(List.of(MemberHistory.create(1L, date, 1_000, 700, 50)));

        // when
        HistoryResponse response = historyReadService.getHistories(1L, HistoryPeriod.DAY, date);

        // then
        assertThat(response.period()).isEqualTo(HistoryPeriod.DAY);
        assertThat(response.startDate()).isEqualTo(date);
        assertThat(response.endDate()).isEqualTo(date);
        assertThat(response.histories()).hasSize(1);
        assertThat(response.histories().getFirst().historyDate()).isEqualTo(date);
        assertThat(response.histories().getFirst().step()).isEqualTo(1_000);
        assertThat(response.totalStep()).isEqualTo(1_000);
        assertThat(response.totalDistance()).isEqualTo(700);
        assertThat(response.totalCalories()).isEqualTo(50);
    }

    @Test
    @DisplayName("일주일 히스토리는 월요일부터 일요일까지 반환한다")
    void getHistoriesReturnsWeekHistories() {
        // given
        LocalDate date = LocalDate.of(2026, 7, 23);
        LocalDate startDate = LocalDate.of(2026, 7, 20);
        LocalDate endDate = LocalDate.of(2026, 7, 26);
        given(memberHistoryRepository.findAllByMemberIdAndHistoryDateBetweenOrderByHistoryDateAsc(
                1L,
                startDate,
                endDate
        )).willReturn(List.of(
                MemberHistory.create(1L, LocalDate.of(2026, 7, 20), 1_000, 700, 50),
                MemberHistory.create(1L, LocalDate.of(2026, 7, 23), 2_000, 1_400, 100)
        ));

        // when
        HistoryResponse response = historyReadService.getHistories(1L, HistoryPeriod.WEEK, date);

        // then
        assertThat(response.startDate()).isEqualTo(startDate);
        assertThat(response.endDate()).isEqualTo(endDate);
        assertThat(response.histories()).hasSize(7);
        assertThat(response.histories().get(0).historyDate()).isEqualTo(startDate);
        assertThat(response.histories().get(3).historyDate()).isEqualTo(LocalDate.of(2026, 7, 23));
        assertThat(response.histories().get(6).historyDate()).isEqualTo(endDate);
        assertThat(response.histories().get(0).step()).isEqualTo(1_000);
        assertThat(response.histories().get(3).step()).isEqualTo(2_000);
        assertThat(response.histories().get(1).step()).isZero();
        assertThat(response.totalStep()).isEqualTo(3_000);
        assertThat(response.totalDistance()).isEqualTo(2_100);
        assertThat(response.totalCalories()).isEqualTo(150);
    }

    @Test
    @DisplayName("한달 히스토리는 해당 월 1일부터 말일까지 반환한다")
    void getHistoriesReturnsMonthHistories() {
        // given
        LocalDate date = LocalDate.of(2026, 7, 23);
        LocalDate startDate = LocalDate.of(2026, 7, 1);
        LocalDate endDate = LocalDate.of(2026, 7, 31);
        given(memberHistoryRepository.findAllByMemberIdAndHistoryDateBetweenOrderByHistoryDateAsc(
                1L,
                startDate,
                endDate
        )).willReturn(List.of(MemberHistory.create(1L, endDate, 1_000, 700, 50)));

        // when
        HistoryResponse response = historyReadService.getHistories(1L, HistoryPeriod.MONTH, date);

        // then
        assertThat(response.startDate()).isEqualTo(startDate);
        assertThat(response.endDate()).isEqualTo(endDate);
        assertThat(response.histories()).hasSize(31);
        assertThat(response.histories().getFirst().historyDate()).isEqualTo(startDate);
        assertThat(response.histories().getLast().historyDate()).isEqualTo(endDate);
        assertThat(response.histories().getFirst().step()).isZero();
        assertThat(response.histories().getLast().step()).isEqualTo(1_000);
    }

    @Test
    @DisplayName("조회 결과가 없어도 기간 전체를 0으로 채워 반환한다")
    void getHistoriesReturnsEmptyHistoriesWhenNoSavedHistory() {
        // given
        LocalDate date = LocalDate.of(2026, 7, 23);
        LocalDate startDate = LocalDate.of(2026, 7, 20);
        LocalDate endDate = LocalDate.of(2026, 7, 26);
        given(memberHistoryRepository.findAllByMemberIdAndHistoryDateBetweenOrderByHistoryDateAsc(
                1L,
                startDate,
                endDate
        )).willReturn(List.of());

        // when
        HistoryResponse response = historyReadService.getHistories(1L, HistoryPeriod.WEEK, date);

        // then
        assertThat(response.histories()).hasSize(7);
        assertThat(response.histories()).allSatisfy(history -> {
            assertThat(history.step()).isZero();
            assertThat(history.distance()).isZero();
            assertThat(history.calories()).isZero();
        });
        assertThat(response.totalStep()).isZero();
        assertThat(response.totalDistance()).isZero();
        assertThat(response.totalCalories()).isZero();
    }
}
