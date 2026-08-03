package com.wecandoit.bingo.service;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.point.service.PointCommandService;
import com.wecandoit.point.service.PointReadService;
import com.wecandoit.game.service.RoomReadService;
import com.wecandoit.game.service.RoomReadService.StepGoalRewardMember;
import com.wecandoit.game.service.RoomReadService.StepGoalRewardTarget;
import com.wecandoit.history.service.HistoryReadService;
import com.wecandoit.history.service.HistoryReadService.StepRecord;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class BingoStepGoalRewardCommandService {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    private final RoomReadService roomReadService;
    private final HistoryReadService historyReadService;
    private final PointReadService pointReadService;
    private final PointCommandService pointCommandService;
    private final BingoBoardRepository bingoBoardRepository;

    public void evaluate(Long memberId) {
        List<StepGoalRewardTarget> rewardTargets = roomReadService.getStepGoalRewardTargets(memberId);
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

        LocalDate today = LocalDate.now(SERVICE_ZONE_ID);
        LocalDate earliestBoardStartedDate = pendingTargets.stream()
                .map(StepGoalRewardTarget::boardStartedDate)
                .min(LocalDate::compareTo)
                .orElseThrow();
        List<Long> memberIds = pendingTargets.stream()
                .flatMap(target -> target.members().stream())
                .map(StepGoalRewardMember::memberId)
                .distinct()
                .toList();
        List<StepRecord> stepRecords = historyReadService.getStepRecords(
                memberIds,
                earliestBoardStartedDate,
                today
        );

        pendingTargets.forEach(target -> grantRewardIfGoalReached(target, stepRecords, today));
    }

    private boolean lockAndCheckRewardPending(StepGoalRewardTarget target) {
        BingoBoard bingoBoard = bingoBoardRepository.findByIdForUpdate(target.bingoBoardId())
                .orElse(null);
        return bingoBoard != null
                && bingoBoard.getStatus() == BingoBoardStatus.ACTIVE
                && !pointReadService.hasDailyStepGoalReward(target.bingoBoardId());
    }

    private void grantRewardIfGoalReached(
            StepGoalRewardTarget target,
            List<StepRecord> stepRecords,
            LocalDate today
    ) {
        if (calculateTotalStep(target, stepRecords, today) < target.targetStepCount()) {
            return;
        }
        pointCommandService.grantDailyStepGoalReward(
                target.roomId(),
                target.bingoBoardId(),
                target.members().stream().map(StepGoalRewardMember::memberId).toList()
        );
    }

    private long calculateTotalStep(
            StepGoalRewardTarget target,
            List<StepRecord> stepRecords,
            LocalDate today
    ) {
        Map<Long, StepGoalRewardMember> membersById = target.members().stream()
                .collect(Collectors.toMap(StepGoalRewardMember::memberId, Function.identity()));
        return stepRecords.stream()
                .filter(stepRecord -> isIncluded(target, membersById, stepRecord, today))
                .mapToLong(StepRecord::step)
                .sum();
    }

    private boolean isIncluded(
            StepGoalRewardTarget target,
            Map<Long, StepGoalRewardMember> membersById,
            StepRecord stepRecord,
            LocalDate today
    ) {
        StepGoalRewardMember member = membersById.get(stepRecord.memberId());
        if (member == null) {
            return false;
        }
        LocalDate validStartDate = member.joinedDate().isAfter(target.boardStartedDate())
                ? member.joinedDate()
                : target.boardStartedDate();
        return !stepRecord.historyDate().isBefore(validStartDate)
                && !stepRecord.historyDate().isAfter(today);
    }
}
