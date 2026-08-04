package com.wecandoit.history.service;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameParticipant;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.history.controller.request.WalkSessionCompleteRequest;
import com.wecandoit.history.controller.request.WalkSessionStartRequest;
import com.wecandoit.history.controller.response.WalkSessionStartResponse;
import com.wecandoit.history.controller.response.WalkSessionResponse;
import com.wecandoit.history.domain.ActiveWalkSession;
import com.wecandoit.history.domain.WalkSession;
import com.wecandoit.history.domain.WalkSessionBingoAchievement;
import com.wecandoit.history.repository.ActiveWalkSessionRepository;
import com.wecandoit.history.repository.WalkSessionBingoAchievementRepository;
import com.wecandoit.history.repository.WalkSessionRepository;
import com.wecandoit.member.repository.MemberRepository;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class WalkSessionCommandService {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");
    private static final Duration ACTIVE_SESSION_TTL = Duration.ofHours(24);

    private final MemberRepository memberRepository;
    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final GameRepository gameRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;
    private final ActiveWalkSessionRepository activeWalkSessionRepository;
    private final WalkSessionRepository walkSessionRepository;
    private final WalkSessionBingoAchievementRepository achievementRepository;
    private final HistoryCommandService historyCommandService;

    public StartResult startSession(Long memberId, WalkSessionStartRequest request) {
        Instant now = Instant.now();
        memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        activeWalkSessionRepository.deleteAllExpired(now);

        ActiveWalkSession existingSession = activeWalkSessionRepository.findByMemberIdForUpdate(memberId)
                .orElse(null);
        if (existingSession != null) {
            Room existingRoom = roomRepository.findById(existingSession.getRoomId())
                    .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
            return new StartResult(WalkSessionStartResponse.of(existingSession, existingRoom), false);
        }

        Room room = roomRepository.findById(request.roomId())
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        validateRoomAccess(memberId, room.getId());
        BoardContext boardContext = getBoardContext(request.bingoBoardId(), List.of());
        validateBoards(memberId, room.getId(), boardContext);

        ActiveWalkSession activeWalkSession = activeWalkSessionRepository.save(ActiveWalkSession.create(
                memberId,
                room.getId(),
                UUID.randomUUID().toString(),
                request.bingoBoardId(),
                now,
                now.plus(ACTIVE_SESSION_TTL)
        ));
        return new StartResult(WalkSessionStartResponse.of(activeWalkSession, room), true);
    }

    public CompletionResult completeSession(Long memberId, WalkSessionCompleteRequest request) {
        UUID walkSessionKey = request.resolvedWalkSessionKey();
        if (walkSessionKey == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        String clientSessionKey = walkSessionKey.toString();
        WalkSession existingSession = walkSessionRepository
                .findByMemberIdAndClientSessionKey(memberId, clientSessionKey)
                .orElse(null);
        if (existingSession != null) {
            return new CompletionResult(toResponse(existingSession), false);
        }

        ActiveWalkSession activeWalkSession = activeWalkSessionRepository
                .findByMemberIdAndWalkSessionKeyForUpdate(memberId, clientSessionKey)
                .orElseThrow(() -> new CustomException(ErrorCode.WALK_SESSION_NOT_FOUND));
        validateActiveSession(activeWalkSession, request);

        Room room = roomRepository.findById(activeWalkSession.getRoomId())
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        validateRoomAccess(memberId, room.getId());

        List<BingoCell> sessionCells = bingoCellRepository
                .findAllByMemberIdAndClientSessionKey(memberId, clientSessionKey);
        validateNoPendingCells(sessionCells);
        BoardContext boardContext = getBoardContext(activeWalkSession.getInitialBingoBoardId(), sessionCells);
        validateBoards(memberId, room.getId(), boardContext);

        WalkSession walkSession = walkSessionRepository.saveAndFlush(WalkSession.create(
                memberId,
                room.getId(),
                clientSessionKey,
                activeWalkSession.getInitialBingoBoardId(),
                activeWalkSession.getStartedAt(),
                request.endedAt().toInstant(),
                request.step(),
                request.distance(),
                request.calories()
        ));
        List<WalkSessionBingoAchievement> achievements = saveAchievements(walkSession, sessionCells);
        addDailyHistory(memberId, request);
        activeWalkSessionRepository.delete(activeWalkSession);

        return new CompletionResult(
                WalkSessionResponse.of(walkSession, room, achievements.size()),
                true
        );
    }

    private void validateActiveSession(ActiveWalkSession activeWalkSession, WalkSessionCompleteRequest request) {
        Instant endedAt = request.endedAt().toInstant();
        if (activeWalkSession.isExpired(Instant.now())) {
            throw new CustomException(ErrorCode.WALK_SESSION_EXPIRED);
        }
        if (!activeWalkSession.getStartedAt().isBefore(endedAt)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private void validateRoomAccess(Long memberId, Long roomId) {
        if (roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            return;
        }
        List<Long> gameIds = gameRepository.findAllByRoomIdIn(List.of(roomId)).stream()
                .map(Game::getId)
                .toList();
        if (gameIds.isEmpty() || !gameParticipantRepository.existsByGameIdInAndMemberId(gameIds, memberId)) {
            throw new CustomException(ErrorCode.WALK_SESSION_FORBIDDEN);
        }
    }

    private void validateNoPendingCells(List<BingoCell> cells) {
        boolean hasPendingCell = cells.stream()
                .anyMatch(cell -> cell.getVerificationStatus() == BingoCellVerificationStatus.PENDING);
        if (hasPendingCell) {
            throw new CustomException(ErrorCode.WALK_SESSION_BINGO_VERIFICATION_IN_PROGRESS);
        }
    }

    private BoardContext getBoardContext(Long initialBoardId, List<BingoCell> cells) {
        LinkedHashSet<Long> boardIds = cells.stream()
                .map(BingoCell::getBoardId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (initialBoardId != null) {
            boardIds.add(initialBoardId);
        }
        if (boardIds.isEmpty()) {
            return BoardContext.empty();
        }

        Map<Long, BingoBoard> boardsById = bingoBoardRepository.findAllById(boardIds).stream()
                .collect(Collectors.toMap(BingoBoard::getId, Function.identity()));
        if (boardsById.size() != boardIds.size()) {
            throw new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND);
        }
        Map<Long, Game> gamesById = gameRepository.findAllById(boardsById.values().stream()
                        .map(BingoBoard::getGameId)
                        .distinct()
                        .toList())
                .stream()
                .collect(Collectors.toMap(Game::getId, Function.identity()));
        if (gamesById.size() != boardsById.values().stream().map(BingoBoard::getGameId).distinct().count()) {
            throw new CustomException(ErrorCode.GAME_NOT_FOUND);
        }
        return new BoardContext(boardsById, gamesById);
    }

    private void validateBoards(Long memberId, Long roomId, BoardContext boardContext) {
        for (BingoBoard board : boardContext.boardsById().values()) {
            Game game = boardContext.gamesById().get(board.getGameId());
            if (!game.getRoomId().equals(roomId)) {
                throw new CustomException(ErrorCode.WALK_SESSION_ROOM_MISMATCH);
            }
            validateBoardAccess(memberId, board);
        }
    }

    private void validateBoardAccess(Long memberId, BingoBoard board) {
        if (board.isShared()) {
            if (!gameParticipantRepository.existsByGameIdAndMemberId(board.getGameId(), memberId)) {
                throw new CustomException(ErrorCode.WALK_SESSION_FORBIDDEN);
            }
            return;
        }
        GameParticipant participant = gameParticipantRepository.findById(board.getGameParticipantId())
                .orElseThrow(() -> new CustomException(ErrorCode.GAME_PARTICIPANT_NOT_FOUND));
        if (!participant.getMemberId().equals(memberId)) {
            throw new CustomException(ErrorCode.WALK_SESSION_FORBIDDEN);
        }
    }

    private List<WalkSessionBingoAchievement> saveAchievements(
            WalkSession walkSession,
            Collection<BingoCell> cells
    ) {
        List<WalkSessionBingoAchievement> achievements = cells.stream()
                .filter(cell -> cell.getVerificationStatus() == BingoCellVerificationStatus.APPROVED)
                .map(cell -> WalkSessionBingoAchievement.create(
                        walkSession.getId(),
                        cell.getBoardId(),
                        cell.getId(),
                        toInstant(cell.getCompletedAt())
                ))
                .toList();
        return achievementRepository.saveAll(achievements);
    }

    private void addDailyHistory(Long memberId, WalkSessionCompleteRequest request) {
        LocalDate historyDate = request.endedAt()
                .atZoneSameInstant(SERVICE_ZONE_ID)
                .toLocalDate();
        historyCommandService.addHistory(
                memberId,
                historyDate,
                request.step(),
                request.distance(),
                request.calories()
        );
    }

    private WalkSessionResponse toResponse(WalkSession walkSession) {
        Room room = roomRepository.findById(walkSession.getRoomId())
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        int achievedMissionCount = Math.toIntExact(achievementRepository.countByWalkSessionId(walkSession.getId()));
        return WalkSessionResponse.of(walkSession, room, achievedMissionCount);
    }

    private Instant toInstant(LocalDateTime localDateTime) {
        if (localDateTime == null) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
        return localDateTime.atZone(SERVICE_ZONE_ID).toInstant();
    }

    public record CompletionResult(
            WalkSessionResponse response,
            boolean created
    ) {
    }

    public record StartResult(
            WalkSessionStartResponse response,
            boolean created
    ) {
    }

    private record BoardContext(
            Map<Long, BingoBoard> boardsById,
            Map<Long, Game> gamesById
    ) {

        private static BoardContext empty() {
            return new BoardContext(Map.of(), Map.of());
        }
    }
}
