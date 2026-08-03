package com.wecandoit.point.service;

import com.wecandoit.point.controller.response.PointResponse;
import com.wecandoit.point.domain.PointHistoryType;
import com.wecandoit.point.repository.PointHistoryRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PointReadService {

    private final MemberRepository memberRepository;
    private final PointHistoryRepository pointHistoryRepository;

    public PointResponse getPoint(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        return PointResponse.of(member.getPoint());
    }

    public boolean hasDailyStepGoalReward(Long bingoBoardId) {
        return pointHistoryRepository.existsByTypeAndReferenceId(
                PointHistoryType.DAILY_STEP_GOAL_REWARD,
                bingoBoardId
        );
    }
}
