package com.wecandoit.bingo.service;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.point.service.PointCommandService;
import com.wecandoit.point.service.PointReadService;
import com.wecandoit.game.service.RoomReadService;
import com.wecandoit.game.service.StepGoalRewardMember;
import com.wecandoit.game.service.StepGoalRewardTarget;
import com.wecandoit.history.repository.WalkSessionRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(isolation = Isolation.READ_COMMITTED)
public class BingoStepGoalRewardCommandService {

    private final RoomReadService roomReadService;
    private final WalkSessionRepository walkSessionRepository;
    private final PointReadService pointReadService;
    private final PointCommandService pointCommandService;
    private final BingoBoardRepository bingoBoardRepository;

    public long evaluate(Long memberId, Long roomId) {
        List<StepGoalRewardTarget> rewardTargets = roomReadService.getStepGoalRewardTargets(memberId).stream()
                .filter(target -> target.roomId().equals(roomId))
                .toList();
        if (rewardTargets.isEmpty()) {
            return 0L;
        }

        List<StepGoalRewardTarget> pendingTargets = rewardTargets.stream()
                .sorted(Comparator.comparing(StepGoalRewardTarget::bingoBoardId))
                .filter(this::lockAndCheckRewardPending)
                .toList();
        if (pendingTargets.isEmpty()) {
            return 0L;
        }

        return pendingTargets.stream()
                .mapToLong(target -> grantRewardIfGoalReached(target, memberId))
                .sum();
    }

    private boolean lockAndCheckRewardPending(StepGoalRewardTarget target) {
        BingoBoard bingoBoard = bingoBoardRepository.findByIdForUpdate(target.bingoBoardId())
                .orElse(null);
        return bingoBoard != null
                && bingoBoard.isActive()
                && !pointReadService.hasDailyStepGoalReward(target.bingoBoardId());
    }

    private long grantRewardIfGoalReached(StepGoalRewardTarget target, Long memberId) {
        if (calculateTotalStep(target) < target.targetStepCount()) {
            return 0L;
        }
        Map<Long, Long> rewardPointsByMemberId = pointCommandService.grantDailyStepGoalReward(
                target.roomId(),
                target.bingoBoardId(),
                target.members().stream().map(StepGoalRewardMember::memberId).toList()
        );
        return rewardPointsByMemberId.getOrDefault(memberId, 0L);
    }

    private long calculateTotalStep(StepGoalRewardTarget target) {
        return walkSessionRepository.sumStepByRoomIdAndInitialBingoBoardIdAndMemberIds(
                target.roomId(),
                target.bingoBoardId(),
                target.members().stream().map(StepGoalRewardMember::memberId).toList()
        );
    }
}
