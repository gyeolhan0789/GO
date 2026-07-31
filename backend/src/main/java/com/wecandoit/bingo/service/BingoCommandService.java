package com.wecandoit.bingo.service;

import com.wecandoit.bingo.controller.response.BingoBoardResponse;
import com.wecandoit.bingo.controller.response.BingoCellResponse;
import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.GameCycleCommandService;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.repository.MissionRepository;
import com.wecandoit.notification.domain.NotificationType;
import com.wecandoit.notification.event.NotificationMessageFactory;
import com.wecandoit.notification.repository.NotificationRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class BingoCommandService {

    private static final List<BingoBoardStatus> INACTIVE_BOARD_STATUSES =
            List.of(BingoBoardStatus.COMPLETED, BingoBoardStatus.EXPIRED);
    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final GameRepository gameRepository;
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;
    private final MissionRepository missionRepository;
    private final NotificationRepository notificationRepository;
    private final GameCycleCommandService gameCycleCommandService;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationMessageFactory notificationMessageFactory;

    public List<BingoBoardResponse> generateBattleBoards(
            Room room,
            Long gameId,
            List<RoomMember> roomMembers
    ) {
        if (room.getMode() != GameMode.BATTLE
                || roomMembers.size() != GameMode.BATTLE.getMaximumParticipants()
                || roomMembers.stream().anyMatch(roomMember ->
                roomMember.getId() == null || !room.getId().equals(roomMember.getRoomId()))) {
            throw new CustomException(ErrorCode.BINGO_BOARD_GENERATE_FORBIDDEN);
        }
        return roomMembers.stream()
                .map(roomMember -> {
                    validateBattleBoardNotExists(roomMember.getId());
                    return generateNewBoard(room, gameId, roomMember, null);
                })
                .toList();
    }

    public BingoBoardResponse generateInitialBoard(Room room, Long gameId) {
        validateBoardNotExists(gameId);
        return generateNewBoard(room, gameId, null, room.getTargetStepCount());
    }

    public BingoCell submitCell(Long memberId, Long roomId, Long cellId, String submitUrl) {
        Room room = roomRepository.findByIdForUpdate(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        validateMember(memberId, roomId);
        validateRoomInProgress(room);
        Game game = findActiveGame(roomId);
        validateGameCycleOpen(game);
        BingoBoard activeBoard = findActiveBoardForUpdate(room, game.getId(), memberId);
        BingoCell cell = bingoCellRepository.findByIdForUpdate(cellId)
                .filter(c -> c.getBoardId().equals(activeBoard.getId()))
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_CELL_NOT_FOUND));

        validateCellSubmittable(cell);
        cell.submit(memberId, submitUrl);
        return bingoCellRepository.save(cell);
    }

    public BingoBoardResponse renewBoard(Long memberId, Long roomId, Integer targetStepCount) {
        return gameCycleCommandService.renewSharedCycle(memberId, roomId, targetStepCount);
    }

    public void notifyRenewalRequired(Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElse(null);
        if (room == null || room.getMode() == GameMode.BATTLE || room.getStatus() != GameRoomStatus.IN_PROGRESS) {
            return;
        }

        Game game = gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(roomId, GameStatus.IN_PROGRESS)
                .orElse(null);
        if (game == null) {
            return;
        }

        if (!hasActiveBoard(game) || !GameCycleCommandService.isRenewalPeriodPassed(game, LocalDateTime.now())
                || hasSentRenewalNotificationToday(room)) {
            return;
        }

        eventPublisher.publishEvent(notificationMessageFactory.weeklyBingoRenewal(room.getHostId()));
    }

    private BingoBoardResponse generateNewBoard(
            Room room,
            Long gameId,
            RoomMember roomMember,
            Integer targetStepCount
    ) {
        int boardSize = room.getBoardSize();
        int cellCount = boardSize * boardSize;
        List<Mission> missions = missionRepository.findRandomMissions(cellCount);
        if (missions.size() < cellCount) {
            throw new CustomException(ErrorCode.MISSION_POOL_INSUFFICIENT);
        }

        BingoBoard board = roomMember == null
                ? BingoBoard.create(gameId, boardSize, targetStepCount)
                : BingoBoard.createForBattle(gameId, roomMember, boardSize);
        bingoBoardRepository.save(board);
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

    private void validateMember(Long memberId, Long roomId) {
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN);
        }
    }

    private void validateRoomInProgress(Room room) {
        if (room.getStatus() != GameRoomStatus.IN_PROGRESS) {
            throw new CustomException(ErrorCode.ROOM_NOT_IN_PROGRESS);
        }
    }

    private void validateCellSubmittable(BingoCell cell) {
        if (cell.getVerificationStatus() == BingoCellVerificationStatus.PENDING) {
            throw new CustomException(ErrorCode.BINGO_CELL_VERIFICATION_IN_PROGRESS);
        }
        if (cell.getVerificationStatus() == BingoCellVerificationStatus.APPROVED) {
            throw new CustomException(ErrorCode.BINGO_CELL_ALREADY_APPROVED);
        }
    }

    private void validateBoardNotExists(Long gameId) {
        if (bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(gameId, INACTIVE_BOARD_STATUSES)
                .isPresent()) {
            throw new CustomException(ErrorCode.BINGO_BOARD_ALREADY_EXISTS);
        }
    }

    private BingoBoard findActiveBoardForUpdate(Room room, Long gameId, Long memberId) {
        if (room.getMode() == GameMode.BATTLE) {
            RoomMember roomMember = roomMemberRepository.findByRoomIdAndMemberId(room.getId(), memberId)
                    .orElseThrow(() -> new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN));
            return bingoBoardRepository.findActiveBoardForUpdate(
                            gameId,
                            roomMember.getId(),
                            INACTIVE_BOARD_STATUSES
                    )
                    .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
        }
        validateMember(memberId, room.getId());
        return bingoBoardRepository.findActiveBoardForUpdate(gameId, INACTIVE_BOARD_STATUSES)
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
    }

    private void validateBattleBoardNotExists(Long roomMemberId) {
        if (bingoBoardRepository.existsByRoomMemberId(roomMemberId)) {
            throw new CustomException(ErrorCode.BINGO_BOARD_ALREADY_EXISTS);
        }
    }

    private boolean hasSentRenewalNotificationToday(Room room) {
        LocalDateTime startOfToday = LocalDateTime.now(SERVICE_ZONE_ID).toLocalDate().atStartOfDay();
        LocalDateTime startOfTomorrow = startOfToday.plusDays(1);
        return notificationRepository.existsByMemberIdAndTypeAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                room.getHostId(),
                NotificationType.WEEKLY_BINGO_RENEWAL,
                startOfToday,
                startOfTomorrow
        );
    }

    private boolean hasActiveBoard(Game game) {
        return bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(
                game.getId(),
                INACTIVE_BOARD_STATUSES
        ).isPresent();
    }

    private void validateGameCycleOpen(Game game) {
        if (GameCycleCommandService.isRenewalPeriodPassed(game, LocalDateTime.now())) {
            throw new CustomException(ErrorCode.BINGO_BOARD_RENEWAL_REQUIRED);
        }
    }

    private Game findActiveGame(Long roomId) {
        return gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(roomId, GameStatus.IN_PROGRESS)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_IN_PROGRESS));
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
