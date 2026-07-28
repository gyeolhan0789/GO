package com.wecandoit.history.service;

import com.wecandoit.history.controller.request.HistorySaveRequest;
import com.wecandoit.history.domain.MemberHistory;
import com.wecandoit.history.repository.MemberHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class HistoryCommandService {

    private final MemberHistoryRepository memberHistoryRepository;

    public void saveHistory(Long memberId, HistorySaveRequest request) {
        memberHistoryRepository.findByMemberIdAndHistoryDate(memberId, request.historyDate())
                .ifPresentOrElse(
                        memberHistory -> memberHistory.add(request.step(), request.distance(), request.calories()),
                        () -> saveNewHistory(memberId, request)
                );
    }

    private void saveNewHistory(Long memberId, HistorySaveRequest request) {
        memberHistoryRepository.save(MemberHistory.create(
                memberId,
                request.historyDate(),
                request.step(),
                request.distance(),
                request.calories()
        ));
    }
}
