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
import com.wecandoit.common.storage.ImageUploadService;
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
import com.wecandoit.history.repository.WalkSessionRepository;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.notification.domain.NotificationType;
import com.wecandoit.notification.event.NotificationMessageFactory;
import com.wecandoit.notification.repository.NotificationRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Transactional
public class BingoCommandService {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");
    private static final String BINGO_CELL_IMAGE_DOMAIN = "bingo-cells";

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final GameRepository gameRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;
    private final MemberRepository memberRepository;
    private final WalkSessionRepository walkSessionRepository;
    private final NotificationRepository notificationRepository;
    private final ImageUploadService imageUploadService;
    private final GameCycleCommandService gameCycleCommandService;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationMessageFactory notificationMessageFactory;

    /**
     * 파일시스템은 트랜잭션에 참여하지 않으므로, 모든 제출 검증을 통과한 뒤에만 이미지를 저장해 고아 파일이 남지 않게 한다.
     */
    public BingoCell submitCell(Long memberId, Long roomId, Long cellId, MultipartFile image) {
        return submitCell(memberId, roomId, cellId, image, null);
    }

    public BingoCell submitCell(
            Long memberId,
            Long roomId,
            Long cellId,
            MultipartFile image,
            UUID clientSessionKey
    ) {
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
        validateSessionKeyAvailable(memberId, clientSessionKey);
        String previousSubmitUrl = cell.getSubmitUrl();
        String submitUrl = imageUploadService.upload(image, BINGO_CELL_IMAGE_DOMAIN, String.valueOf(cellId));
        cell.submit(memberId, submitUrl, clientSessionKey == null ? null : clientSessionKey.toString());
        BingoCell savedCell = bingoCellRepository.save(cell);
        imageUploadService.delete(previousSubmitUrl);
        return savedCell;
    }

    private void validateSessionKeyAvailable(Long memberId, UUID clientSessionKey) {
        if (clientSessionKey == null) {
            return;
        }
        memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        if (walkSessionRepository.existsByMemberIdAndClientSessionKey(
                memberId,
                clientSessionKey.toString()
        )) {
            throw new CustomException(ErrorCode.WALK_SESSION_ALREADY_COMPLETED);
        }
    }

    public BingoBoardResponse renewBoard(
            Long memberId,
            Long roomId,
            int boardSize,
            int targetStepCount
    ) {
        return gameCycleCommandService.renewSharedCycle(
                memberId,
                roomId,
                boardSize,
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
                            BingoBoardStatus.inactiveStatuses()
                    )
                    .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
        }
        return bingoBoardRepository.findActiveBoardForUpdate(gameId, BingoBoardStatus.inactiveStatuses())
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
                BingoBoardStatus.inactiveStatuses()
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
