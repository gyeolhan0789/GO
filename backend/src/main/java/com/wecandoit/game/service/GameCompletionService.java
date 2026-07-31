package com.wecandoit.game.service;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.bingo.domain.BingoLineCounter;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.cash.domain.CashHistory;
import com.wecandoit.cash.domain.CashRewardPolicy;
import com.wecandoit.cash.repository.CashHistoryRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameParticipant;
import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.GameResultParticipant;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.GameResultParticipantRepository;
import com.wecandoit.game.repository.GameResultRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.notification.event.NotificationMessageFactory;
import java.time.LocalDateTime;
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

    private final RoomRepository roomRepository;
    private final GameRepository gameRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final GameResultRepository gameResultRepository;
    private final GameResultParticipantRepository gameResultParticipantRepository;
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;
    private final MemberRepository memberRepository;
    private final CashHistoryRepository cashHistoryRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationMessageFactory notificationMessageFactory;

    public void evaluateAndCompleteIfNeeded(Long gameId, Long completedBoardId) {
        Game game = gameRepository.findByIdForUpdate(gameId)
                .orElseThrow(() -> new CustomException(ErrorCode.GAME_NOT_FOUND));
        if (game.getStatus() != GameStatus.ACTIVE) {
            return;
        }

        Room room = roomRepository.findByIdForUpdate(game.getRoomId())
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        if (room.getStatus() != RoomStatus.ACTIVE || room.getMode() != GameMode.BATTLE) {
            return;
        }

        List<BingoBoard> boards = bingoBoardRepository.findAllByGameIdOrderByIdAsc(gameId);
        if (boards.size() != GameMode.BATTLE.getMaximumParticipants()) {
            throw new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND);
        }
        Map<Long, List<BingoCell>> cellsByBoardId = bingoCellRepository.findAllByBoardIdIn(
                        boards.stream().map(BingoBoard::getId).toList()
                )
                .stream()
                .collect(Collectors.groupingBy(BingoCell::getBoardId));
        if (cellsByBoardId.values().stream()
                .flatMap(List::stream)
                .anyMatch(cell -> cell.getVerificationStatus() == BingoCellVerificationStatus.PENDING)) {
            return;
        }

        BingoBoard winnerBoard = boards.stream()
                .filter(board -> countLines(board, cellsByBoardId) >= board.getTargetBingoCount())
                .findFirst()
                .orElse(null);
        if (winnerBoard == null) {
            return;
        }

        List<GameParticipant> participants =
                gameParticipantRepository.findAllByGameIdOrderByJoinedAtAsc(gameId);
        Long winnerMemberId = getBoardOwnerMemberId(winnerBoard, participants);
        LocalDateTime endedAt = LocalDateTime.now();
        int winnerLineCount = countLines(winnerBoard, cellsByBoardId);
        int winnerCompletedMissionCount = countCompletedCells(
                cellsByBoardId.getOrDefault(winnerBoard.getId(), List.of())
        );

        game.completeAt(endedAt);
        boards.forEach(board -> board.completeAt(endedAt));
        gameResultRepository.saveAndFlush(GameResult.create(
                game.getId(),
                room.getId(),
                true,
                winnerLineCount,
                winnerCompletedMissionCount,
                CashRewardPolicy.BATTLE_WINNER_GAME_GOAL.getPoint()
        ));

        List<GameResultParticipant> results = participants.stream()
                .map(participant -> createParticipantResult(
                        room,
                        game,
                        participant,
                        winnerMemberId,
                        getCompletedCount(participant, boards, cellsByBoardId)
                ))
                .toList();
        gameResultParticipantRepository.saveAll(results);
        participants.forEach(participant -> eventPublisher.publishEvent(
                notificationMessageFactory.battleResult(participant.getMemberId())));
    }

    private GameResultParticipant createParticipantResult(
            Room room,
            Game game,
            GameParticipant participant,
            Long winnerMemberId,
            int completedMissionCount
    ) {
        boolean result = participant.getMemberId().equals(winnerMemberId);
        long rewardCash = result
                ? CashRewardPolicy.BATTLE_WINNER_GAME_GOAL.getPoint()
                : CashRewardPolicy.BATTLE_LOSER_GAME_GOAL.getPoint();
        grantReward(participant.getMemberId(), game.getId(), room.getId(), rewardCash);
        return GameResultParticipant.create(
                game.getId(),
                participant.getMemberId(),
                completedMissionCount,
                rewardCash,
                result
        );
    }

    private int countLines(BingoBoard board, Map<Long, List<BingoCell>> cellsByBoardId) {
        return BingoLineCounter.countCompletedLines(
                board.getBoardSize(),
                cellsByBoardId.getOrDefault(board.getId(), List.of())
        );
    }

    private int getCompletedCount(
            GameParticipant participant,
            List<BingoBoard> boards,
            Map<Long, List<BingoCell>> cellsByBoardId
    ) {
        return boards.stream()
                .filter(board -> participant.getId().equals(board.getGameParticipantId()))
                .findFirst()
                .map(board -> countCompletedCells(cellsByBoardId.getOrDefault(board.getId(), List.of())))
                .orElse(0);
    }

    private int countCompletedCells(List<BingoCell> cells) {
        return (int) cells.stream()
                .filter(cell -> cell.getVerificationStatus() == BingoCellVerificationStatus.APPROVED)
                .count();
    }

    private Long getBoardOwnerMemberId(BingoBoard board, List<GameParticipant> participants) {
        if (!board.isPersonal()) {
            throw new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND);
        }
        return participants.stream()
                .filter(participant -> participant.getId().equals(board.getGameParticipantId()))
                .map(GameParticipant::getMemberId)
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.GAME_PARTICIPANT_NOT_FOUND));
    }

    private void grantReward(Long memberId, Long gameId, Long roomId, long rewardCash) {
        Member member = memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        member.addCash(rewardCash);
        cashHistoryRepository.save(CashHistory.gameGoalReward(memberId, gameId, roomId, rewardCash));
        eventPublisher.publishEvent(notificationMessageFactory.rewardEarned(memberId, rewardCash));
    }
}
