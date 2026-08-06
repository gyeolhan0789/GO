package com.wecandoit.game.service;

import com.wecandoit.bingo.controller.response.BingoBoardResponse;
import com.wecandoit.bingo.controller.response.BingoCellResponse;
import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.bingo.domain.BingoLineCounter;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.point.domain.PointHistory;
import com.wecandoit.point.domain.PointRewardPolicy;
import com.wecandoit.point.repository.PointHistoryRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameParticipant;
import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.GameResultParticipant;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.GameResultParticipantRepository;
import com.wecandoit.game.repository.GameResultRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.service.MissionSelectionReadService;
import com.wecandoit.notification.event.NotificationMessageFactory;
import java.time.LocalDateTime;
import java.util.ArrayList;
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

    public static final int RENEWAL_PERIOD_DAYS = 7;

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final GameRepository gameRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final GameResultRepository gameResultRepository;
    private final GameResultParticipantRepository gameResultParticipantRepository;
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;
    private final MissionSelectionReadService missionSelectionReadService;
    private final MemberRepository memberRepository;
    private final PointHistoryRepository pointHistoryRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationMessageFactory notificationMessageFactory;

    public void startInitialSharedCycle(Room room, List<RoomMember> roomMembers) {
        validateSharedRoom(room);
        Game game = startGame(room, roomMembers);
        createSharedBoard(game.getId(), room.getBoardSize(), room.getTargetStepCount());
    }

    public void startInitialBattleCycle(Room room, List<RoomMember> roomMembers) {
        validateBattleParticipants(room, roomMembers);
        startBattleCycle(room, roomMembers, room.getBoardSize(), room.getTargetBingoCount());
    }

    public void registerCurrentCycleParticipant(Room room, Long memberId) {
        if (room.getMode() == GameMode.BATTLE) {
            return;
        }
        Game game = findActiveGame(room.getId());
        if (!gameParticipantRepository.existsByGameIdAndMemberId(game.getId(), memberId)) {
            gameParticipantRepository.save(GameParticipant.create(game.getId(), memberId));
        }
    }

    public BingoBoardResponse renewSharedCycle(
            Long memberId,
            Long roomId,
            int boardSize,
            int targetStepCount
    ) {
        validateBoardSettings(boardSize, targetStepCount);
        Room room = findActiveRoomForUpdate(roomId);
        validateRenewalRoom(memberId, room);

        Game game = findActiveGameForUpdate(roomId);
        validateResultNotExists(game.getId());
        BingoBoard activeBoard = findActiveSharedBoardForUpdate(game.getId());
        List<BingoCell> cells = bingoCellRepository.findAllByBoardId(activeBoard.getId());
        validateNoPendingCells(cells);

        LocalDateTime now = LocalDateTime.now();
        boolean renewalPeriodPassed = isRenewalPeriodPassed(game, now);
        boolean boardCompleted = isBoardCompleted(activeBoard, cells, now);
        if (!boardCompleted && !renewalPeriodPassed) {
            throw new CustomException(ErrorCode.BINGO_BOARD_NOT_COMPLETED);
        }

        LocalDateTime endedAt = calculateEndedAt(game, now);
        completeSharedCycle(room, game, activeBoard, cells, endedAt);

        List<RoomMember> currentMembers = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(roomId);
        Game nextGame = startGame(room, currentMembers);
        return generateSharedBoard(
                room,
                memberId,
                nextGame.getId(),
                boardSize,
                targetStepCount
        );
    }

    public void closeActiveCycle(Room room, Long leavingMemberId) {
        Game game = gameRepository.findActiveGameForUpdate(room.getId(), GameStatus.ACTIVE)
                .orElse(null);
        if (game == null) {
            return;
        }
        validateResultNotExists(game.getId());

        if (room.getMode() == GameMode.BATTLE) {
            completeBattleByForfeit(room, game, leavingMemberId);
            return;
        }

        BingoBoard board = findActiveSharedBoardForUpdate(game.getId());
        List<BingoCell> cells = bingoCellRepository.findAllByBoardId(board.getId());
        validateNoPendingCells(cells);
        completeSharedCycle(room, game, board, cells, calculateEndedAt(game, LocalDateTime.now()));
    }

    public void completeBattleByForfeit(Room room, Long gameId, Long loserMemberId) {
        Game game = gameRepository.findByIdForUpdate(gameId)
                .orElseThrow(() -> new CustomException(ErrorCode.GAME_NOT_FOUND));
        if (game.getStatus() != GameStatus.ACTIVE) {
            return;
        }
        validateResultNotExists(gameId);
        completeBattleByForfeit(room, game, loserMemberId);
    }

    public void rematchBattle(Long memberId, Long roomId) {
        Room room = findActiveRoomForUpdate(roomId);
        if (room.getMode() != GameMode.BATTLE || !room.isHost(memberId)) {
            throw new CustomException(ErrorCode.BINGO_BOARD_GENERATE_FORBIDDEN);
        }
        if (gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(roomId, GameStatus.ACTIVE).isPresent()) {
            throw new CustomException(ErrorCode.BINGO_BOARD_ALREADY_EXISTS);
        }

        List<RoomMember> roomMembers = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(roomId);
        validateBattleParticipants(room, roomMembers);
        Game latestGame = gameRepository.findFirstByRoomIdOrderByIdDesc(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.GAME_NOT_FOUND));
        BingoBoard latestBoard = bingoBoardRepository.findAllByGameIdOrderByIdAsc(latestGame.getId()).stream()
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
        startBattleCycle(
                room,
                roomMembers,
                latestBoard.getBoardSize(),
                latestBoard.getTargetBingoCount()
        );
    }

    public static boolean isRenewalPeriodPassed(Game game, LocalDateTime now) {
        return !game.getStartedAt().plusDays(RENEWAL_PERIOD_DAYS).isAfter(now);
    }

    private Room findActiveRoomForUpdate(Long roomId) {
        Room room = roomRepository.findByIdForUpdate(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        if (room.getStatus() != RoomStatus.ACTIVE) {
            throw new CustomException(ErrorCode.ROOM_CLOSED);
        }
        return room;
    }

    private Game findActiveGame(Long roomId) {
        return gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(roomId, GameStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_IN_PROGRESS));
    }

    private Game findActiveGameForUpdate(Long roomId) {
        return gameRepository.findActiveGameForUpdate(roomId, GameStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_IN_PROGRESS));
    }

    private BingoBoard findActiveSharedBoardForUpdate(Long gameId) {
        return bingoBoardRepository.findActiveBoardForUpdate(
                        gameId,
                        BingoBoardStatus.inactiveStatuses()
                )
                .filter(BingoBoard::isShared)
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
    }

    private void validateRenewalRoom(Long memberId, Room room) {
        validateSharedRoom(room);
        if (!room.isHost(memberId)) {
            throw new CustomException(ErrorCode.BINGO_BOARD_RENEWAL_FORBIDDEN);
        }
    }

    private void validateSharedRoom(Room room) {
        if (room.getMode() == GameMode.BATTLE) {
            throw new CustomException(ErrorCode.BINGO_BOARD_RENEWAL_FORBIDDEN);
        }
    }

    private void validateBattleParticipants(Room room, List<RoomMember> roomMembers) {
        if (room.getMode() != GameMode.BATTLE
                || roomMembers.size() != GameMode.BATTLE.getMaximumParticipants()) {
            throw new CustomException(ErrorCode.ROOM_MINIMUM_PARTICIPANTS_REQUIRED);
        }
    }

    private void validateBoardSettings(int boardSize, int targetStepCount) {
        if (boardSize < 3 || boardSize > 5) {
            throw new CustomException(ErrorCode.BINGO_BOARD_SIZE_INVALID);
        }
        if (targetStepCount < 1) {
            throw new CustomException(ErrorCode.ROOM_TARGET_STEP_COUNT_REQUIRED);
        }
    }

    private void validateResultNotExists(Long gameId) {
        if (gameResultRepository.existsByGameId(gameId)) {
            throw new CustomException(ErrorCode.GAME_RESULT_ALREADY_EXISTS);
        }
    }

    private void validateNoPendingCells(List<BingoCell> cells) {
        if (cells.stream().anyMatch(cell ->
                cell.getVerificationStatus() == BingoCellVerificationStatus.PENDING)) {
            throw new CustomException(ErrorCode.BINGO_CELL_VERIFICATION_IN_PROGRESS);
        }
    }

    private LocalDateTime calculateEndedAt(Game game, LocalDateTime now) {
        LocalDateTime renewalDueAt = game.getStartedAt().plusDays(RENEWAL_PERIOD_DAYS);
        return now.isAfter(renewalDueAt) ? renewalDueAt : now;
    }

    private void completeSharedCycle(
            Room room,
            Game game,
            BingoBoard board,
            List<BingoCell> cells,
            LocalDateTime endedAt
    ) {
        int bingoCount = countBingoLines(board, cells, endedAt);
        boolean result = isBoardCompleted(board, cells, endedAt);
        int completedMissionCount = countCompletedCells(cells, endedAt);

        game.completeAt(endedAt);
        if (result) {
            board.completeAt(endedAt);
        } else {
            board.expireAt(endedAt);
        }

        gameResultRepository.saveAndFlush(GameResult.create(
                game.getId(),
                room.getId(),
                result,
                bingoCount,
                completedMissionCount,
                result ? PointRewardPolicy.GAME_GOAL.getPoint() : 0L
        ));
        gameResultParticipantRepository.saveAll(createSharedResultParticipants(
                room,
                game,
                cells,
                endedAt,
                result
        ));
    }

    private List<GameResultParticipant> createSharedResultParticipants(
            Room room,
            Game game,
            List<BingoCell> cells,
            LocalDateTime endedAt,
            boolean result
    ) {
        Map<Long, Integer> completedCountByMember = cells.stream()
                .filter(cell -> cell.isCompletedBy(endedAt))
                .filter(cell -> cell.getMemberId() != null)
                .collect(Collectors.groupingBy(
                        BingoCell::getMemberId,
                        Collectors.collectingAndThen(Collectors.counting(), Long::intValue)
                ));
        long rewardPoint = result ? PointRewardPolicy.GAME_GOAL.getPoint() : 0L;
        return gameParticipantRepository.findAllByGameIdOrderByJoinedAtAsc(game.getId()).stream()
                .map(participant -> {
                    if (rewardPoint > 0) {
                        grantReward(participant.getMemberId(), game.getId(), room.getId(), rewardPoint);
                    }
                    return GameResultParticipant.create(
                            game.getId(),
                            participant.getMemberId(),
                            completedCountByMember.getOrDefault(participant.getMemberId(), 0),
                            rewardPoint,
                            result
                    );
                })
                .toList();
    }

    private void completeBattleByForfeit(Room room, Game game, Long loserMemberId) {
        List<GameParticipant> participants =
                gameParticipantRepository.findAllByGameIdOrderByJoinedAtAsc(game.getId());
        if (participants.size() != GameMode.BATTLE.getMaximumParticipants()) {
            throw new CustomException(ErrorCode.GAME_PARTICIPANT_NOT_FOUND);
        }
        GameParticipant winner = participants.stream()
                .filter(participant -> !participant.getMemberId().equals(loserMemberId))
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.GAME_PARTICIPANT_NOT_FOUND));

        List<BingoBoard> boards = bingoBoardRepository.findAllByGameIdOrderByIdAsc(game.getId());
        List<BingoCell> cells = getCells(boards);
        validateNoPendingCells(cells);
        Map<Long, List<BingoCell>> cellsByBoardId = cells.stream()
                .collect(Collectors.groupingBy(BingoCell::getBoardId));
        LocalDateTime endedAt = LocalDateTime.now();
        game.completeAt(endedAt);
        boards.forEach(board -> board.completeAt(endedAt));

        BingoBoard winnerBoard = boards.stream()
                .filter(board -> winner.getId().equals(board.getGameParticipantId()))
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
        List<BingoCell> winnerCells = cellsByBoardId.getOrDefault(winnerBoard.getId(), List.of());
        int winnerBingoCount = countBingoLines(winnerBoard, winnerCells, endedAt);
        int winnerCompletedCount = countCompletedCells(winnerCells, endedAt);
        gameResultRepository.saveAndFlush(GameResult.create(
                game.getId(),
                room.getId(),
                true,
                winnerBingoCount,
                winnerCompletedCount,
                PointRewardPolicy.BATTLE_WINNER_GAME_GOAL.getPoint()
        ));

        List<GameResultParticipant> results = participants.stream()
                .map(participant -> createBattleResultParticipant(
                        room,
                        game,
                        participant,
                        winner.getMemberId(),
                        getParticipantCompletedCount(participant, boards, cellsByBoardId, endedAt)
                ))
                .toList();
        gameResultParticipantRepository.saveAll(results);
        participants.forEach(participant -> eventPublisher.publishEvent(
                notificationMessageFactory.battleResult(participant.getMemberId())));
    }

    private GameResultParticipant createBattleResultParticipant(
            Room room,
            Game game,
            GameParticipant participant,
            Long winnerMemberId,
            int completedMissionCount
    ) {
        boolean result = participant.getMemberId().equals(winnerMemberId);
        long rewardPoint = result
                ? PointRewardPolicy.BATTLE_WINNER_GAME_GOAL.getPoint()
                : PointRewardPolicy.BATTLE_LOSER_GAME_GOAL.getPoint();
        grantReward(participant.getMemberId(), game.getId(), room.getId(), rewardPoint);
        return GameResultParticipant.create(
                game.getId(),
                participant.getMemberId(),
                completedMissionCount,
                rewardPoint,
                result
        );
    }

    private int getParticipantCompletedCount(
            GameParticipant participant,
            List<BingoBoard> boards,
            Map<Long, List<BingoCell>> cellsByBoardId,
            LocalDateTime endedAt
    ) {
        return boards.stream()
                .filter(board -> participant.getId().equals(board.getGameParticipantId()))
                .findFirst()
                .map(board -> countCompletedCells(
                        cellsByBoardId.getOrDefault(board.getId(), List.of()),
                        endedAt
                ))
                .orElse(0);
    }

    private Game startGame(Room room, List<RoomMember> roomMembers) {
        if (roomMembers.isEmpty()) {
            throw new CustomException(ErrorCode.ROOM_MINIMUM_PARTICIPANTS_REQUIRED);
        }
        if (gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(room.getId(), GameStatus.ACTIVE).isPresent()) {
            throw new CustomException(ErrorCode.BINGO_BOARD_ALREADY_EXISTS);
        }
        Game game = gameRepository.save(Game.start(room.getId()));
        gameParticipantRepository.saveAll(roomMembers.stream()
                .map(roomMember -> GameParticipant.create(game.getId(), roomMember.getMemberId()))
                .toList());
        return game;
    }

    private void startBattleCycle(
            Room room,
            List<RoomMember> roomMembers,
            int boardSize,
            int targetBingoCount
    ) {
        Game game = startGame(room, roomMembers);
        List<GameParticipant> participants =
                gameParticipantRepository.findAllByGameIdOrderByJoinedAtAsc(game.getId());
        for (GameParticipant participant : participants) {
            generateBattleBoard(room.getId(), game.getId(), participant, boardSize, targetBingoCount);
        }
    }

    private void createSharedBoard(Long gameId, int boardSize, int targetStepCount) {
        List<Mission> missions = findMissions(boardSize);
        BingoBoard board = bingoBoardRepository.save(BingoBoard.create(
                gameId,
                boardSize,
                targetStepCount
        ));
        saveCells(board, boardSize, missions);
    }

    private BingoBoardResponse generateSharedBoard(
            Room room,
            Long memberId,
            Long gameId,
            int boardSize,
            int targetStepCount
    ) {
        List<Mission> missions = findMissions(boardSize);
        BingoBoard board = bingoBoardRepository.save(BingoBoard.create(
                gameId,
                boardSize,
                targetStepCount
        ));
        List<BingoCell> cells = saveCells(board, boardSize, missions);
        return BingoBoardResponse.of(
                board,
                room.getId(),
                toCellResponses(cells, missions),
                0,
                0,
                false,
                room.isHost(memberId),
                false,
                false
        );
    }

    private void generateBattleBoard(
            Long roomId,
            Long gameId,
            GameParticipant participant,
            int boardSize,
            int targetBingoCount
    ) {
        List<Mission> missions = findMissions(boardSize);
        BingoBoard board = bingoBoardRepository.save(BingoBoard.createForBattle(
                gameId,
                participant.getId(),
                boardSize,
                targetBingoCount
        ));
        saveCells(board, boardSize, missions);
    }

    private List<Mission> findMissions(int boardSize) {
        return missionSelectionReadService.selectBoardMissions(boardSize * boardSize);
    }

    private List<BingoCell> saveCells(BingoBoard board, int boardSize, List<Mission> missions) {
        List<BingoCell> cells = new ArrayList<>();
        int index = 0;
        for (int row = 0; row < boardSize; row++) {
            for (int col = 0; col < boardSize; col++) {
                Mission mission = missions.get(index++);
                cells.add(bingoCellRepository.save(BingoCell.create(
                        board.getId(),
                        mission.getId(),
                        row,
                        col
                )));
            }
        }
        return cells;
    }

    private List<BingoCellResponse> toCellResponses(List<BingoCell> cells, List<Mission> missions) {
        List<BingoCellResponse> responses = new ArrayList<>(cells.size());
        for (int i = 0; i < cells.size(); i++) {
            responses.add(BingoCellResponse.of(cells.get(i), missions.get(i)));
        }
        return responses;
    }

    private List<BingoCell> getCells(List<BingoBoard> boards) {
        if (boards.isEmpty()) {
            throw new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND);
        }
        return bingoCellRepository.findAllByBoardIdIn(boards.stream()
                .map(BingoBoard::getId)
                .toList());
    }

    private int countBingoLines(BingoBoard board, List<BingoCell> cells, LocalDateTime endedAt) {
        return BingoLineCounter.countCompletedLines(
                board.getBoardSize(),
                cells,
                cell -> cell.isCompletedBy(endedAt)
        );
    }

    private int countCompletedCells(List<BingoCell> cells, LocalDateTime endedAt) {
        return (int) cells.stream()
                .filter(cell -> cell.isCompletedBy(endedAt))
                .count();
    }

    private boolean isBoardCompleted(BingoBoard board, List<BingoCell> cells, LocalDateTime endedAt) {
        int totalCellCount = board.getBoardSize() * board.getBoardSize();
        return cells.size() == totalCellCount
                && countCompletedCells(cells, endedAt) == totalCellCount;
    }

    private void grantReward(Long memberId, Long gameId, Long roomId, long rewardPoint) {
        Member member = memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        member.addPoint(rewardPoint);
        pointHistoryRepository.save(PointHistory.gameGoalReward(memberId, gameId, roomId, rewardPoint));
        eventPublisher.publishEvent(notificationMessageFactory.rewardEarned(memberId, rewardPoint));
    }
}
