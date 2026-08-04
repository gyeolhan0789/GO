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

    public void evaluate(Long memberId, Long roomId) {
        List<StepGoalRewardTarget> rewardTargets = roomReadService.getStepGoalRewardTargets(memberId).stream()
                .filter(target -> target.roomId().equals(roomId))
                .toList();
        if (rewardTargets.isEmpty()) {
            return;
        }

        List<StepGoalRewardTarget> pendingTargets = rewardTargets.stream()
                .sorted(Comparator.comparing(StepGoalRewardTarget::bingoBoardId))
                .filter(this::lockAndCheckRewardPending)
                .toList();
        if (pendingTargets.isEmpty()) {
            return;
        }

        pendingTargets.forEach(this::grantRewardIfGoalReached);
    }

    private boolean lockAndCheckRewardPending(StepGoalRewardTarget target) {
        BingoBoard bingoBoard = bingoBoardRepository.findByIdForUpdate(target.bingoBoardId())
                .orElse(null);
        return bingoBoard != null
                && bingoBoard.isActive()
                && !pointReadService.hasDailyStepGoalReward(target.bingoBoardId());
    }

    private void grantRewardIfGoalReached(StepGoalRewardTarget target) {
        if (calculateTotalStep(target) < target.targetStepCount()) {
            return;
        }
        pointCommandService.grantDailyStepGoalReward(
                target.roomId(),
                target.bingoBoardId(),
                target.members().stream().map(StepGoalRewardMember::memberId).toList()
        );
    }

    private long calculateTotalStep(StepGoalRewardTarget target) {
        return walkSessionRepository.sumStepByRoomIdAndInitialBingoBoardIdAndMemberIds(
                target.roomId(),
                target.bingoBoardId(),
                target.members().stream().map(StepGoalRewardMember::memberId).toList()
        );
    }
}
