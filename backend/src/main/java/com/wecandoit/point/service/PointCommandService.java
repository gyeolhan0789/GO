package com.wecandoit.point.service;

import com.wecandoit.point.domain.PointHistory;
import com.wecandoit.point.domain.PointHistoryType;
import com.wecandoit.point.domain.PointRewardPolicy;
import com.wecandoit.point.repository.PointHistoryRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.mission.domain.MissionDifficulty;
import com.wecandoit.notification.event.NotificationMessageFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class PointCommandService {

    private final MemberRepository memberRepository;
    private final PointHistoryRepository pointHistoryRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationMessageFactory notificationMessageFactory;

    public long grantBingoCellReward(Long memberId, Long roomId, Long cellId, MissionDifficulty missionDifficulty) {
        Member member = memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        if (pointHistoryRepository.existsByMemberIdAndTypeAndReferenceId(
                memberId,
                PointHistoryType.BINGO_CELL_REWARD,
                cellId
        )) {
            return 0L;
        }

        long rewardPoint = PointRewardPolicy.getBingoCellRewardPoint(missionDifficulty);
        member.addPoint(rewardPoint);
        pointHistoryRepository.save(PointHistory.bingoCellReward(memberId, cellId, roomId, rewardPoint));
        eventPublisher.publishEvent(notificationMessageFactory.rewardEarned(memberId, rewardPoint));
        return rewardPoint;
    }

    public void grantDailyStepGoalReward(Long roomId, Long bingoBoardId, List<Long> memberIds) {
        long rewardPoint = PointRewardPolicy.DAILY_STEP_GOAL.getPoint();
        List<Long> sortedMemberIds = memberIds.stream()
                .distinct()
                .sorted()
                .toList();

        sortedMemberIds.forEach(memberId -> {
            Member member = memberRepository.findByIdForUpdate(memberId)
                    .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
            member.addPoint(rewardPoint);
            pointHistoryRepository.save(PointHistory.dailyStepGoalReward(
                    memberId,
                    bingoBoardId,
                    roomId,
                    rewardPoint
            ));
            eventPublisher.publishEvent(notificationMessageFactory.rewardEarned(memberId, rewardPoint));
        });
    }
}
