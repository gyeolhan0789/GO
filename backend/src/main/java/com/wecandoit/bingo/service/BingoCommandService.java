package com.wecandoit.bingo.service;

import com.wecandoit.bingo.controller.response.BingoBoardResponse;
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
import com.wecandoit.game.domain.GameParticipant;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.GameCycleCommandService;
import com.wecandoit.notification.domain.NotificationType;
import com.wecandoit.notification.event.NotificationMessageFactory;
import com.wecandoit.notification.repository.NotificationRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
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
    private final GameParticipantRepository gameParticipantRepository;
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;
    private final NotificationRepository notificationRepository;
    private final GameCycleCommandService gameCycleCommandService;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationMessageFactory notificationMessageFactory;

    public BingoCell submitCell(Long memberId, Long roomId, Long cellId, String submitUrl) {
        Room room = roomRepository.findByIdForUpdate(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        validateMember(memberId, roomId);
        validateRoomActive(room);
        Game game = findActiveGame(roomId);
        validateGameCycleOpen(room, game);
        BingoBoard activeBoard = findActiveBoardForUpdate(room, game.getId(), memberId);
        BingoCell cell = bingoCellRepository.findByIdForUpdate(cellId)
                .filter(candidate -> candidate.getBoardId().equals(activeBoard.getId()))
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_CELL_NOT_FOUND));

        validateCellSubmittable(cell);
        cell.submit(memberId, submitUrl);
        return bingoCellRepository.save(cell);
    }

    public BingoBoardResponse renewBoard(
            Long memberId,
            Long roomId,
            int boardSize,
            int targetBingoCount,
            int targetStepCount
    ) {
        return gameCycleCommandService.renewSharedCycle(
                memberId,
                roomId,
                boardSize,
                targetBingoCount,
                targetStepCount
        );
    }

    public void rematchBattle(Long memberId, Long roomId) {
        gameCycleCommandService.rematchBattle(memberId, roomId);
    }

    public void notifyRenewalRequired(Long roomId) {
        Room room = roomRepository.findById(roomId).orElse(null);
        if (room == null || room.getMode() == GameMode.BATTLE || room.getStatus() != RoomStatus.ACTIVE) {
            return;
        }

        Game game = gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(roomId, GameStatus.ACTIVE)
                .orElse(null);
        if (game == null
                || !hasActiveBoard(game)
                || !GameCycleCommandService.isRenewalPeriodPassed(game, LocalDateTime.now())
                || hasSentRenewalNotificationToday(room)) {
            return;
        }

        eventPublisher.publishEvent(notificationMessageFactory.weeklyBingoRenewal(room.getHostId()));
    }

    private void validateMember(Long memberId, Long roomId) {
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN);
        }
    }

    private void validateRoomActive(Room room) {
        if (room.getStatus() != RoomStatus.ACTIVE) {
            throw new CustomException(ErrorCode.ROOM_CLOSED);
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

    private BingoBoard findActiveBoardForUpdate(Room room, Long gameId, Long memberId) {
        if (room.getMode() == GameMode.BATTLE) {
            GameParticipant participant = gameParticipantRepository.findByGameIdAndMemberId(gameId, memberId)
                    .orElseThrow(() -> new CustomException(ErrorCode.GAME_PARTICIPANT_NOT_FOUND));
            return bingoBoardRepository.findActiveBoardForUpdate(
                            gameId,
                            participant.getId(),
                            INACTIVE_BOARD_STATUSES
                    )
                    .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
        }
        return bingoBoardRepository.findActiveBoardForUpdate(gameId, INACTIVE_BOARD_STATUSES)
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
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

    private void validateGameCycleOpen(Room room, Game game) {
        if (room.getMode() != GameMode.BATTLE
                && GameCycleCommandService.isRenewalPeriodPassed(game, LocalDateTime.now())) {
            throw new CustomException(ErrorCode.BINGO_BOARD_RENEWAL_REQUIRED);
        }
    }

    private Game findActiveGame(Long roomId) {
        return gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(roomId, GameStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_IN_PROGRESS));
    }
}
