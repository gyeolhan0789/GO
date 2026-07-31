package com.wecandoit.game.service;

import com.wecandoit.bingo.controller.response.BingoBoardResponse;
import com.wecandoit.bingo.controller.response.BingoCellResponse;
import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
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
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.GameResultParticipant;
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
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.repository.MissionRepository;
import com.wecandoit.notification.event.NotificationMessageFactory;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
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
public class GameCycleCommandService {

    private static final int RENEWAL_PERIOD_DAYS = 7;
    private static final List<BingoBoardStatus> INACTIVE_BOARD_STATUSES =
            List.of(BingoBoardStatus.COMPLETED, BingoBoardStatus.EXPIRED);

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final GameRepository gameRepository;
    private final GameResultRepository gameResultRepository;
    private final GameResultParticipantRepository gameResultParticipantRepository;
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;
    private final MissionRepository missionRepository;
    private final MemberRepository memberRepository;
    private final CashHistoryRepository cashHistoryRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationMessageFactory notificationMessageFactory;

    public BingoBoardResponse renewSharedCycle(Long memberId, Long roomId, Integer targetStepCount) {
        validateTargetStepCount(targetStepCount);
        Room room = roomRepository.findByIdForUpdate(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        validateRenewalRoom(memberId, room);

        Game game = gameRepository.findActiveGameForUpdate(roomId, GameStatus.IN_PROGRESS)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_IN_PROGRESS));
        if (gameResultRepository.existsByGameId(game.getId())) {
            throw new CustomException(ErrorCode.GAME_RESULT_ALREADY_EXISTS);
        }

        BingoBoard activeBoard = bingoBoardRepository.findActiveBoardForUpdate(game.getId(), INACTIVE_BOARD_STATUSES)
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
        List<BingoCell> cells = bingoCellRepository.findAllByBoardId(activeBoard.getId());
        LocalDateTime now = LocalDateTime.now();
        boolean boardCompleted = isBoardCompleted(cells);
        boolean renewalPeriodPassed = isRenewalPeriodPassed(game, now);
        if (!boardCompleted && !renewalPeriodPassed) {
            throw new CustomException(ErrorCode.BINGO_BOARD_NOT_COMPLETED);
        }

        LocalDateTime completedAt = calculateCompletedAt(game, now);
        boolean result = isBoardCompletedAt(cells, completedAt);
        int completedMissionCount = countCompletedCells(cells, completedAt);
        int bingoCount = BingoLineCounter.countCompletedLines(
                room.getBoardSize(),
                cells,
                cell -> isCompletedAt(cell, completedAt)
        );

        game.completeAt(completedAt);
        if (result) {
            activeBoard.completeAt(completedAt);
        } else {
            activeBoard.expireAt(completedAt);
        }
        gameResultRepository.saveAndFlush(GameResult.create(
                game.getId(),
                roomId,
                result,
                bingoCount,
                completedMissionCount,
                getGameResultRewardCash(result)
        ));
        gameResultParticipantRepository.saveAll(createParticipants(
                room,
                game.getId(),
                cells,
                completedAt,
                result
        ));

        Game nextGame = gameRepository.save(Game.start(roomId));
        return generateNewBoard(room, nextGame.getId(), targetStepCount);
    }

    public static boolean isRenewalPeriodPassed(Game game, LocalDateTime now) {
        return !game.getStartedAt().plusDays(RENEWAL_PERIOD_DAYS).isAfter(now);
    }

    private void validateTargetStepCount(Integer targetStepCount) {
        if (targetStepCount == null || targetStepCount < 1) {
            throw new CustomException(ErrorCode.ROOM_TARGET_STEP_COUNT_REQUIRED);
        }
    }

    private void validateRenewalRoom(Long memberId, Room room) {
        if (room.getStatus() != GameRoomStatus.IN_PROGRESS) {
            throw new CustomException(ErrorCode.ROOM_NOT_IN_PROGRESS);
        }
        if (room.getMode() == GameMode.BATTLE) {
            throw new CustomException(ErrorCode.BINGO_BOARD_RENEWAL_FORBIDDEN);
        }
        if (!room.isHost(memberId)) {
            throw new CustomException(ErrorCode.BINGO_BOARD_RENEWAL_FORBIDDEN);
        }
    }

    private LocalDateTime calculateCompletedAt(Game game, LocalDateTime now) {
        LocalDateTime renewalDueAt = game.getStartedAt().plusDays(RENEWAL_PERIOD_DAYS);
        if (now.isAfter(renewalDueAt)) {
            return renewalDueAt;
        }
        return now;
    }

    private boolean isBoardCompleted(List<BingoCell> cells) {
        return !cells.isEmpty() && cells.stream().allMatch(cell -> cell.getCompletedAt() != null);
    }

    private boolean isBoardCompletedAt(List<BingoCell> cells, LocalDateTime completedAt) {
        return !cells.isEmpty() && cells.stream().allMatch(cell -> isCompletedAt(cell, completedAt));
    }

    private boolean isCompletedAt(BingoCell cell, LocalDateTime completedAt) {
        return cell.getCompletedAt() != null && !cell.getCompletedAt().isAfter(completedAt);
    }

    private int countCompletedCells(List<BingoCell> cells, LocalDateTime completedAt) {
        return (int) cells.stream()
                .filter(cell -> isCompletedAt(cell, completedAt))
                .count();
    }

    private List<GameResultParticipant> createParticipants(
            Room room,
            Long gameId,
            List<BingoCell> cells,
            LocalDateTime completedAt,
            boolean result
    ) {
        Map<Long, Integer> completedCountByMember = cells.stream()
                .filter(cell -> isCompletedAt(cell, completedAt))
                .filter(cell -> cell.getMemberId() != null)
                .collect(Collectors.groupingBy(
                        BingoCell::getMemberId,
                        Collectors.collectingAndThen(Collectors.counting(), Long::intValue)
                ));
        long rewardCash = getParticipantRewardCash(result);
        return roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(room.getId()).stream()
                .sorted(Comparator.comparing(RoomMember::getMemberId))
                .map(roomMember -> createParticipant(
                        roomMember,
                        gameId,
                        room.getId(),
                        completedCountByMember.getOrDefault(roomMember.getMemberId(), 0),
                        rewardCash,
                        result
                ))
                .toList();
    }

    private GameResultParticipant createParticipant(
            RoomMember roomMember,
            Long gameId,
            Long roomId,
            int completedMissionCount,
            long rewardCash,
            boolean result
    ) {
        if (rewardCash > 0) {
            grantReward(roomMember.getMemberId(), gameId, roomId, rewardCash);
        }
        return GameResultParticipant.create(
                gameId,
                roomMember.getMemberId(),
                completedMissionCount,
                rewardCash,
                result
        );
    }

    private long getGameResultRewardCash(boolean result) {
        return result ? CashRewardPolicy.GAME_GOAL.getPoint() : 0L;
    }

    private long getParticipantRewardCash(boolean result) {
        return result ? CashRewardPolicy.GAME_GOAL.getPoint() : 0L;
    }

    private void grantReward(Long memberId, Long gameId, Long roomId, long rewardCash) {
        Member member = memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        member.addCash(rewardCash);
        cashHistoryRepository.save(CashHistory.gameGoalReward(memberId, gameId, roomId, rewardCash));
        eventPublisher.publishEvent(notificationMessageFactory.rewardEarned(memberId, rewardCash));
    }

    private BingoBoardResponse generateNewBoard(Room room, Long gameId, Integer targetStepCount) {
        int boardSize = room.getBoardSize();
        int cellCount = boardSize * boardSize;
        List<Mission> missions = missionRepository.findRandomMissions(cellCount);
        if (missions.size() < cellCount) {
            throw new CustomException(ErrorCode.MISSION_POOL_INSUFFICIENT);
        }

        BingoBoard board = bingoBoardRepository.save(BingoBoard.create(gameId, boardSize, targetStepCount));
        List<BingoCellResponse> cellResponses = createCells(board, boardSize, missions);
        return BingoBoardResponse.of(
                board,
                room.getId(),
                cellResponses,
                room.getTargetBingoCount(),
                0,
                0,
                false,
                false,
                false
        );
    }

    private List<BingoCellResponse> createCells(BingoBoard board, int boardSize, List<Mission> missions) {
        List<BingoCellResponse> cellResponses = new ArrayList<>();
        int index = 0;
        for (int row = 0; row < boardSize; row++) {
            for (int col = 0; col < boardSize; col++) {
                Mission mission = missions.get(index++);
                BingoCell cell = bingoCellRepository.save(BingoCell.create(board.getId(), mission.getId(), row, col));
                cellResponses.add(BingoCellResponse.of(cell, mission));
            }
        }
        return cellResponses;
    }
}
