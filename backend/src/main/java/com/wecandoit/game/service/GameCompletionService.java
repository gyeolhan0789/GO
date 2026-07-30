package com.wecandoit.game.service;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoLineCounter;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.cash.domain.CashHistory;
import com.wecandoit.cash.domain.CashRewardPolicy;
import com.wecandoit.cash.repository.CashHistoryRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.GameResultParticipant;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.GameResultParticipantRepository;
import com.wecandoit.game.repository.GameResultRepository;
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

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final GameRepository gameRepository;
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
        if (game.getStatus() != GameStatus.IN_PROGRESS) {
            return;
        }

        Long roomId = game.getRoomId();
        Room room = roomRepository.findByIdForUpdate(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));

        if (room.getStatus() != GameRoomStatus.IN_PROGRESS) {
            return;
        }
        if (room.getMode() != GameMode.BATTLE) {
            return;
        }

        List<BingoCell> cells = bingoCellRepository.findAllByBoardId(completedBoardId);
        int lineCount = BingoLineCounter.countCompletedLines(room.getBoardSize(), cells);
        if (lineCount < room.getTargetBingoCount()) {
            return;
        }

        BingoBoard completedBoard = findBoardForCompletion(gameId, completedBoardId);
        List<BingoBoard> boards = bingoBoardRepository.findAllByGameIdOrderByIdAsc(gameId);
        if (boards.size() != GameMode.BATTLE.getMaximumParticipants()) {
            throw new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND);
        }

        int completedMissionCount = (int) cells.stream()
                .filter(cell -> cell.getCompletedAt() != null)
                .count();

        Map<Long, Integer> completedCountByMember = countBattleCompletedMissions(boards);

        List<RoomMember> members = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(roomId);
        Long winnerMemberId = getBoardOwnerMemberId(completedBoard);

        game.complete();
        boards.forEach(BingoBoard::complete);
        gameResultRepository.saveAndFlush(GameResult.create(
                game.getId(),
                roomId,
                true,
                lineCount,
                completedMissionCount,
                getGameResultRewardCash(room.getMode())
        ));

        List<GameResultParticipant> participants = members.stream()
                .sorted(java.util.Comparator.comparing(RoomMember::getMemberId))
                .map(member -> updateMemberResultAndGrantReward(
                        member,
                        completedCountByMember.getOrDefault(member.getMemberId(), 0),
                        roomId,
                        game.getId(),
                        room.getMode(),
                        winnerMemberId
                ))
                .toList();
        gameResultParticipantRepository.saveAll(participants);
        room.finishGame(members.size());

        members.forEach(member -> eventPublisher.publishEvent(
                notificationMessageFactory.battleResult(member.getMemberId())));
    }

    private BingoBoard findBoardForCompletion(Long gameId, Long boardId) {
        return bingoBoardRepository.findByIdForUpdate(boardId)
                .filter(board -> board.getGameId().equals(gameId))
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
    }

    private GameResultParticipant updateMemberResultAndGrantReward(
            RoomMember member,
            int completedCount,
            Long roomId,
            Long gameId,
            GameMode mode,
            Long winnerMemberId
    ) {
        member.updateCompletedMissionCount(completedCount);
        boolean result = mode != GameMode.BATTLE || member.getMemberId().equals(winnerMemberId);
        long rewardCash = getParticipantRewardCash(mode, result);
        if (rewardCash > 0) {
            grantReward(member.getMemberId(), gameId, roomId, rewardCash);
        }
        return GameResultParticipant.create(
                gameId,
                member.getMemberId(),
                completedCount,
                rewardCash,
                result
        );
    }

    private Map<Long, Integer> countBattleCompletedMissions(List<BingoBoard> boards) {
        Map<Long, List<BingoCell>> cellsByBoardId = bingoCellRepository.findAllByBoardIdIn(
                        boards.stream().map(BingoBoard::getId).toList()
                )
                .stream()
                .collect(Collectors.groupingBy(BingoCell::getBoardId));
        return boards.stream()
                .collect(Collectors.toMap(
                        this::getBoardOwnerMemberId,
                        board -> (int) cellsByBoardId.getOrDefault(board.getId(), List.of()).stream()
                                .filter(cell -> cell.getCompletedAt() != null)
                                .count()
                ));
    }

    private Long getBoardOwnerMemberId(BingoBoard board) {
        if (board.getRoomMember() == null) {
            throw new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND);
        }
        return board.getRoomMember().getMemberId();
    }

    private long getGameResultRewardCash(GameMode mode) {
        if (mode == GameMode.BATTLE) {
            return CashRewardPolicy.BATTLE_WINNER_GAME_GOAL.getPoint();
        }
        return CashRewardPolicy.GAME_GOAL.getPoint();
    }

    private long getParticipantRewardCash(GameMode mode, boolean result) {
        if (mode == GameMode.BATTLE) {
            return result
                    ? CashRewardPolicy.BATTLE_WINNER_GAME_GOAL.getPoint()
                    : CashRewardPolicy.BATTLE_LOSER_GAME_GOAL.getPoint();
        }
        return CashRewardPolicy.GAME_GOAL.getPoint();
    }

    private void grantReward(Long memberId, Long gameId, Long roomId, long rewardCash) {
        Member member = memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        member.addCash(rewardCash);
        cashHistoryRepository.save(CashHistory.gameGoalReward(memberId, gameId, roomId, rewardCash));
        eventPublisher.publishEvent(notificationMessageFactory.rewardEarned(memberId, rewardCash));
    }
}
