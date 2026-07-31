package com.wecandoit.history.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.wecandoit.bingo.service.BingoStepGoalRewardCommandService;
import com.wecandoit.history.controller.request.HistorySaveRequest;
import com.wecandoit.history.domain.MemberHistory;
import com.wecandoit.history.repository.MemberHistoryRepository;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

@DisplayName("히스토리 커맨드 서비스")
@ExtendWith(MockitoExtension.class)
class HistoryCommandServiceTest {

    @Mock
    private MemberHistoryRepository memberHistoryRepository;
    @Mock
    private BingoStepGoalRewardCommandService bingoStepGoalRewardCommandService;
    @InjectMocks
    private HistoryCommandService historyCommandService;

    @Test
    @DisplayName("같은 날짜 기록이 없으면 새 히스토리를 저장한다")
    void saveHistoryCreatesNewHistory() {
        // given
        LocalDate historyDate = LocalDate.of(2026, 7, 23);
        HistorySaveRequest request = new HistorySaveRequest(historyDate, 1_000, 700, 50);
        given(memberHistoryRepository.findByMemberIdAndHistoryDate(1L, historyDate)).willReturn(Optional.empty());

        // when
        historyCommandService.saveHistory(1L, request);

        // then
        ArgumentCaptor<MemberHistory> captor = ArgumentCaptor.forClass(MemberHistory.class);
        then(memberHistoryRepository).should().save(captor.capture());

        MemberHistory memberHistory = captor.getValue();
        assertThat(memberHistory.getMemberId()).isEqualTo(1L);
        assertThat(memberHistory.getHistoryDate()).isEqualTo(historyDate);
        assertThat(memberHistory.getStep()).isEqualTo(1_000);
        assertThat(memberHistory.getDistance()).isEqualTo(700);
        assertThat(memberHistory.getCalories()).isEqualTo(50);
        then(bingoStepGoalRewardCommandService).should().evaluate(1L);
    }

    @Test
    @DisplayName("같은 날짜 기록이 있으면 기존 히스토리에 값을 누적한다")
    void saveHistoryAddsExistingHistory() {
        // given
        LocalDate historyDate = LocalDate.of(2026, 7, 23);
        HistorySaveRequest request = new HistorySaveRequest(historyDate, 500, 300, 20);
        MemberHistory memberHistory = MemberHistory.create(1L, historyDate, 1_000, 700, 50);
        given(memberHistoryRepository.findByMemberIdAndHistoryDate(1L, historyDate))
                .willReturn(Optional.of(memberHistory));

        // when
        historyCommandService.saveHistory(1L, request);

        // then
        assertThat(memberHistory.getStep()).isEqualTo(1_500);
        assertThat(memberHistory.getDistance()).isEqualTo(1_000);
        assertThat(memberHistory.getCalories()).isEqualTo(70);
        then(bingoStepGoalRewardCommandService).should().evaluate(1L);
    }

    @Test
    @DisplayName("같은 날짜 기록이 있으면 새 히스토리를 저장하지 않는다")
    void saveHistoryDoesNotSaveExistingHistory() {
        // given
        LocalDate historyDate = LocalDate.of(2026, 7, 23);
        HistorySaveRequest request = new HistorySaveRequest(historyDate, 500, 300, 20);
        MemberHistory memberHistory = MemberHistory.create(1L, historyDate, 1_000, 700, 50);
        given(memberHistoryRepository.findByMemberIdAndHistoryDate(1L, historyDate))
                .willReturn(Optional.of(memberHistory));

        // when
        historyCommandService.saveHistory(1L, request);

        // then
        then(memberHistoryRepository).should(never()).save(Mockito.any(MemberHistory.class));
    }
}
