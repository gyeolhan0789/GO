package com.wecandoit.game.service;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoLineCounter;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.service.BingoReadService;
import com.wecandoit.cash.domain.CashHistory;
import com.wecandoit.cash.repository.CashHistoryRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.GameResultParticipant;
import com.wecandoit.game.repository.GameResultParticipantRepository;
import com.wecandoit.game.repository.GameResultRepository;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
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
    private static final List<BingoBoardStatus> INACTIVE_BOARD_STATUSES =
            List.of(BingoBoardStatus.COMPLETED, BingoBoardStatus.EXPIRED);

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final GameRepository gameRepository;
    private final GameResultRepository gameResultRepository;
    private final GameResultParticipantRepository gameResultParticipantRepository;
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoReadService bingoReadService;
    private final MemberRepository memberRepository;
    private final CashHistoryRepository cashHistoryRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationMessageFactory notificationMessageFactory;

    public void evaluateAndCompleteIfNeeded(Long gameId) {
        evaluateAndCompleteIfNeeded(gameId, null);
    }

    public void evaluateAndCompleteIfNeeded(Long gameId, Long completedBoardId) {
        Game game = gameRepository.findByIdForUpdate(gameId)
                .orElseThrow(() -> new CustomException(ErrorCode.GAME_NOT_FOUND));
        if (game.getStatus() != GameStatus.IN_PROGRESS) {
            return;
        }

        Long roomId = game.getRoomId();
        Room room = roomRepository.findByIdForUpdate(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));

        if (room.getStatus() != GameRoomStatus.IN_PROGRESS) {
            return;
        }

        List<BingoCell> cells = completedBoardId == null
                ? bingoReadService.getActiveBoardCells(gameId)
                : bingoReadService.getBoardCells(completedBoardId);
        if (room.getMode() != GameMode.BATTLE
                && cells.stream().anyMatch(cell -> cell.getCompletedAt() == null)) {
            return;
        }

        int lineCount = BingoLineCounter.countCompletedLines(room.getBoardSize(), cells);
        if (room.getMode() == GameMode.BATTLE && lineCount < room.getTargetBingoCount()) {
            return;
        }

        BingoBoard board = findBoardForCompletion(gameId, completedBoardId);

        game.complete();
        board.complete();

        int completedMissionCount = (int) cells.stream()
                .filter(cell -> cell.getCompletedAt() != null)
                .count();

        Map<Long, Long> completedCountByMember = cells.stream()
                .filter(cell -> cell.getCompletedAt() != null)
                .collect(Collectors.groupingBy(BingoCell::getMemberId, Collectors.counting()));

        List<RoomMember> members = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(roomId);
        gameResultRepository.saveAndFlush(GameResult.create(
                game.getId(),
                roomId,
                true,
                lineCount,
                completedMissionCount,
                BINGO_REWARD_CASH
        ));

        List<GameResultParticipant> participants = members.stream()
                .sorted(java.util.Comparator.comparing(RoomMember::getMemberId))
                .map(member -> updateMemberResultAndGrantReward(
                        member,
                        completedCountByMember.getOrDefault(member.getMemberId(), 0L),
                        roomId,
                        game.getId()
                ))
                .toList();
        gameResultParticipantRepository.saveAll(participants);
        room.finishGame(members.size());

        members.forEach(member -> eventPublisher.publishEvent(
                notificationMessageFactory.battleResult(member.getMemberId())));
    }

    private BingoBoard findBoardForCompletion(Long gameId, Long boardId) {
        if (boardId == null) {
            return bingoBoardRepository.findActiveBoardForUpdate(gameId, INACTIVE_BOARD_STATUSES)
                    .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
        }
        return bingoBoardRepository.findByIdForUpdate(boardId)
                .filter(board -> board.getGameId().equals(gameId))
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
    }

    private GameResultParticipant updateMemberResultAndGrantReward(
            RoomMember member,
            long completedCount,
            Long roomId,
            Long gameId
    ) {
        member.updateCompletedMissionCount((int) completedCount);
        grantReward(member.getMemberId(), gameId, roomId);
        return GameResultParticipant.create(
                gameId,
                member.getMemberId(),
                (int) completedCount,
                BINGO_REWARD_CASH
        );
    }

    private void grantReward(Long memberId, Long gameId, Long roomId) {
        Member member = memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        member.addCash(BINGO_REWARD_CASH);
        cashHistoryRepository.save(CashHistory.bingoReward(memberId, gameId, roomId, BINGO_REWARD_CASH));
        eventPublisher.publishEvent(notificationMessageFactory.rewardEarned(memberId, BINGO_REWARD_CASH));
    }
}
