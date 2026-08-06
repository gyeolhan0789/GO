package com.wecandoit.history.service;

import com.wecandoit.history.controller.request.HistorySaveRequest;
import com.wecandoit.history.domain.MemberHistory;
import com.wecandoit.history.repository.MemberHistoryRepository;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(isolation = Isolation.READ_COMMITTED)
public class HistoryCommandService {

    private final MemberHistoryRepository memberHistoryRepository;

    public void saveHistory(Long memberId, HistorySaveRequest request) {
        addHistory(
                memberId,
                request.historyDate(),
                request.step(),
                request.distance(),
                request.calories()
        );
    }

    public void addHistory(
            Long memberId,
            LocalDate historyDate,
            int step,
            int distance,
            int calories
    ) {
        memberHistoryRepository.findByMemberIdAndHistoryDate(memberId, historyDate)
                .ifPresentOrElse(
                        memberHistory -> memberHistory.add(step, distance, calories),
                        () -> saveNewHistory(memberId, historyDate, step, distance, calories)
                );
    }

    private void saveNewHistory(
            Long memberId,
            LocalDate historyDate,
            int step,
            int distance,
            int calories
    ) {
        memberHistoryRepository.save(MemberHistory.create(
                memberId,
                historyDate,
                step,
                distance,
                calories
        ));
    }
}
