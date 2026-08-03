package com.wecandoit.point.service;

import com.wecandoit.point.controller.response.PointHistoryResponse;
import com.wecandoit.point.repository.PointHistoryRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PointHistoryReadService {

    private final PointHistoryRepository pointHistoryRepository;

    public List<PointHistoryResponse> getPointHistories(Long memberId) {
        return pointHistoryRepository.findAllByMemberIdOrderByCreatedAtDescIdDesc(memberId).stream()
                .map(PointHistoryResponse::from)
                .toList();
    }
}
