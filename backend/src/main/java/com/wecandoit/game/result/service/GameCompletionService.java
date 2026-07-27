package com.wecandoit.game.result.service;

import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoLineCounter;
import com.wecandoit.bingo.service.BingoReadService;
import com.wecandoit.cash.domain.CashHistory;
import com.wecandoit.cash.repository.CashHistoryRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.result.domain.GameResult;
import com.wecandoit.game.result.repository.GameResultRepository;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.GameMode;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.domain.RoomMember;
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.notification.event.NotificationMessageFactory;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class GameCompletionService {

    private static final long BINGO_REWARD_CASH = 500L;

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final GameResultRepository gameResultRepository;
    private final BingoReadService bingoReadService;
    private final MemberRepository memberRepository;
    private final CashHistoryRepository cashHistoryRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationMessageFactory notificationMessageFactory;

    public void evaluateAndCompleteIfNeeded(Long roomId) {
        Room room = roomRepository.findByIdForUpdate(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));

        if (room.getStatus() != GameRoomStatus.IN_PROGRESS) {
            return;
        }

        List<BingoCell> cells = bingoReadService.getActiveBoardCells(roomId);
        if (room.getMode() == GameMode.SINGLE && cells.stream().anyMatch(cell -> cell.getCompletedAt() == null)) {
            return;
        }

        int lineCount = BingoLineCounter.countCompletedLines(room.getBoardSize(), cells);
        if (room.getMode() == GameMode.COOPERATE && lineCount < room.getTargetBingoCount()) {
            return;
        }

        room.complete();

        int completedMissionCount = (int) cells.stream()
                .filter(cell -> cell.getCompletedAt() != null)
                .count();

        Map<Long, Long> completedCountByMember = cells.stream()
                .filter(cell -> cell.getCompletedAt() != null)
                .collect(Collectors.groupingBy(BingoCell::getMemberId, Collectors.counting()));

        List<RoomMember> members = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(roomId);
        members.stream()
                .sorted(java.util.Comparator.comparing(RoomMember::getMemberId))
                .forEach(member -> updateMemberResultAndGrantReward(
                        member,
                        completedCountByMember.getOrDefault(member.getMemberId(), 0L),
                        roomId
                ));

        gameResultRepository.save(GameResult.create(
                roomId,
                true,
                lineCount,
                completedMissionCount,
                BINGO_REWARD_CASH
        ));

        members.forEach(member -> eventPublisher.publishEvent(
                notificationMessageFactory.battleResult(member.getMemberId())));
    }

    private void updateMemberResultAndGrantReward(RoomMember member, long completedCount, Long roomId) {
        member.updateCompletedMissionCount((int) completedCount);
        grantReward(member.getMemberId(), roomId);
    }

    private void grantReward(Long memberId, Long roomId) {
        Member member = memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        member.addCash(BINGO_REWARD_CASH);
        cashHistoryRepository.save(CashHistory.bingoReward(memberId, roomId, BINGO_REWARD_CASH));
        eventPublisher.publishEvent(notificationMessageFactory.rewardEarned(memberId, BINGO_REWARD_CASH));
    }
}
