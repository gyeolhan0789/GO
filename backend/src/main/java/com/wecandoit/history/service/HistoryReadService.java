package com.wecandoit.history.service;

import com.wecandoit.history.controller.response.HistoryDateResponse;
import com.wecandoit.history.controller.response.HistoryResponse;
import com.wecandoit.history.domain.HistoryPeriod;
import com.wecandoit.history.domain.MemberHistory;
import com.wecandoit.history.repository.MemberHistoryRepository;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HistoryReadService {

    private final MemberHistoryRepository memberHistoryRepository;

    public HistoryResponse getHistories(Long memberId, HistoryPeriod period, LocalDate date) {
        LocalDate startDate = period.getStartDate(date);
        LocalDate endDate = period.getEndDate(date);
        Map<LocalDate, MemberHistory> memberHistoriesByDate = getMemberHistoriesByDate(
                memberId,
                startDate,
                endDate
        );

        List<HistoryDateResponse> histories = startDate.datesUntil(endDate.plusDays(1))
                .map(historyDate -> getHistoryDateResponse(memberHistoriesByDate, historyDate))
                .toList();

        return HistoryResponse.from(period, startDate, endDate, histories);
    }

    public List<StepRecord> getStepRecords(
            Collection<Long> memberIds,
            LocalDate startDate,
            LocalDate endDate
    ) {
        if (memberIds.isEmpty()) {
            return List.of();
        }
        return memberHistoryRepository
                .findAllByMemberIdInAndHistoryDateBetweenOrderByMemberIdAscHistoryDateAsc(
                        memberIds,
                        startDate,
                        endDate
                )
                .stream()
                .map(StepRecord::from)
                .toList();
    }

    private Map<LocalDate, MemberHistory> getMemberHistoriesByDate(
            Long memberId,
            LocalDate startDate,
            LocalDate endDate
    ) {
        return memberHistoryRepository.findAllByMemberIdAndHistoryDateBetweenOrderByHistoryDateAsc(
                        memberId,
                        startDate,
                        endDate
                ).stream()
                .collect(Collectors.toMap(MemberHistory::getHistoryDate, memberHistory -> memberHistory));
    }

    private HistoryDateResponse getHistoryDateResponse(
            Map<LocalDate, MemberHistory> memberHistoriesByDate,
            LocalDate historyDate
    ) {
        MemberHistory memberHistory = memberHistoriesByDate.get(historyDate);
        if (memberHistory == null) {
            return HistoryDateResponse.empty(historyDate);
        }
        return HistoryDateResponse.from(memberHistory);
    }
}
