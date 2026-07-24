package com.wecandoit.cash.service;

import com.wecandoit.cash.controller.response.CashHistoryResponse;
import com.wecandoit.cash.repository.CashHistoryRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CashHistoryReadService {

    private final CashHistoryRepository cashHistoryRepository;

    public List<CashHistoryResponse> getCashHistories(Long memberId) {
        return cashHistoryRepository.findAllByMemberIdOrderByCreatedAtDescIdDesc(memberId).stream()
                .map(CashHistoryResponse::from)
                .toList();
    }
}
