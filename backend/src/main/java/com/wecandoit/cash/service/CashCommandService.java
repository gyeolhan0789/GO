package com.wecandoit.cash.service;

import com.wecandoit.cash.domain.CashHistory;
import com.wecandoit.cash.domain.CashHistoryType;
import com.wecandoit.cash.domain.CashRewardPolicy;
import com.wecandoit.cash.repository.CashHistoryRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.mission.domain.MissionType;
import com.wecandoit.notification.event.NotificationMessageFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class CashCommandService {

    private final MemberRepository memberRepository;
    private final CashHistoryRepository cashHistoryRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationMessageFactory notificationMessageFactory;

    public long grantBingoCellReward(Long memberId, Long roomId, Long cellId, MissionType missionType) {
        Member member = memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        if (cashHistoryRepository.existsByMemberIdAndTypeAndReferenceId(
                memberId,
                CashHistoryType.BINGO_CELL_REWARD,
                cellId
        )) {
            return 0L;
        }

        long rewardCash = CashRewardPolicy.getBingoCellRewardPoint(missionType);
        member.addCash(rewardCash);
        cashHistoryRepository.save(CashHistory.bingoCellReward(memberId, cellId, roomId, rewardCash));
        eventPublisher.publishEvent(notificationMessageFactory.rewardEarned(memberId, rewardCash));
        return rewardCash;
    }
}
