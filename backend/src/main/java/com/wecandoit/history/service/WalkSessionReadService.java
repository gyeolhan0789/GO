package com.wecandoit.history.service;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.history.controller.response.WalkSessionBingoBoardResponse;
import com.wecandoit.history.controller.response.WalkSessionBingoCellResponse;
import com.wecandoit.history.controller.response.WalkSessionDetailResponse;
import com.wecandoit.history.controller.response.WalkSessionResponse;
import com.wecandoit.history.domain.WalkSession;
import com.wecandoit.history.domain.WalkSessionBingoAchievement;
import com.wecandoit.history.repository.WalkSessionBingoAchievementRepository;
import com.wecandoit.history.repository.WalkSessionRepository;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.repository.MissionRepository;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WalkSessionReadService {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    private final WalkSessionRepository walkSessionRepository;
    private final WalkSessionBingoAchievementRepository achievementRepository;
    private final RoomRepository roomRepository;
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;
    private final MissionRepository missionRepository;

    public SliceResponse<WalkSessionResponse> getWalkSessions(
            Long memberId,
            Long roomId,
            Pageable pageable
    ) {
        Pageable fixedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Slice<WalkSession> walkSessions = findWalkSessions(memberId, roomId, fixedPageable);
        if (walkSessions.isEmpty()) {
            return SliceResponse.from(new SliceImpl<>(List.of(), fixedPageable, false));
        }

        Map<Long, Room> roomsById = roomRepository.findAllById(walkSessions.getContent().stream()
                        .map(WalkSession::getRoomId)
                        .distinct()
                        .toList())
                .stream()
                .collect(Collectors.toMap(Room::getId, Function.identity()));
        Map<Long, Integer> achievementCountsBySessionId = achievementRepository
                .findAllByWalkSessionIdIn(walkSessions.getContent().stream().map(WalkSession::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(
                        WalkSessionBingoAchievement::getWalkSessionId,
                        Collectors.collectingAndThen(Collectors.counting(), Long::intValue)
                ));

        return SliceResponse.from(walkSessions.map(walkSession -> WalkSessionResponse.of(
                walkSession,
                getRoom(roomsById, walkSession.getRoomId()),
                achievementCountsBySessionId.getOrDefault(walkSession.getId(), 0)
        )));
    }

    private Slice<WalkSession> findWalkSessions(Long memberId, Long roomId, Pageable pageable) {
        if (roomId == null) {
            return walkSessionRepository.findAllByMemberIdOrderByEndedAtDescIdDesc(memberId, pageable);
        }
        return walkSessionRepository.findAllByMemberIdAndRoomIdOrderByEndedAtDescIdDesc(
                memberId,
                roomId,
                pageable
        );
    }

    public WalkSessionDetailResponse getWalkSession(Long memberId, Long walkSessionId) {
        WalkSession walkSession = walkSessionRepository.findById(walkSessionId)
                .orElseThrow(() -> new CustomException(ErrorCode.WALK_SESSION_NOT_FOUND));
        if (!walkSession.getMemberId().equals(memberId)) {
            throw new CustomException(ErrorCode.WALK_SESSION_FORBIDDEN);
        }
        Room room = roomRepository.findById(walkSession.getRoomId())
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        List<WalkSessionBingoAchievement> achievements = achievementRepository
                .findAllByWalkSessionId(walkSessionId);

        return WalkSessionDetailResponse.of(
                walkSession,
                room,
                achievements.size(),
                getBingoBoards(walkSession, achievements)
        );
    }

    private List<WalkSessionBingoBoardResponse> getBingoBoards(
            WalkSession walkSession,
            List<WalkSessionBingoAchievement> achievements
    ) {
        LinkedHashSet<Long> boardIds = new LinkedHashSet<>();
        if (walkSession.getInitialBingoBoardId() != null) {
            boardIds.add(walkSession.getInitialBingoBoardId());
        }
        achievements.stream()
                .map(WalkSessionBingoAchievement::getBingoBoardId)
                .forEach(boardIds::add);
        if (boardIds.isEmpty()) {
            return List.of();
        }

        Map<Long, BingoBoard> boardsById = bingoBoardRepository.findAllById(boardIds).stream()
                .collect(Collectors.toMap(BingoBoard::getId, Function.identity()));
        if (boardsById.size() != boardIds.size()) {
            throw new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND);
        }
        List<BingoCell> cells = bingoCellRepository.findAllByBoardIdIn(List.copyOf(boardIds));
        Map<Long, List<BingoCell>> cellsByBoardId = cells.stream()
                .collect(Collectors.groupingBy(BingoCell::getBoardId));
        Map<Long, Mission> missionsById = missionRepository.findAllById(cells.stream()
                        .map(BingoCell::getMissionId)
                        .distinct()
                        .toList())
                .stream()
                .collect(Collectors.toMap(Mission::getId, Function.identity()));
        Map<Long, Instant> achievedAtByCellId = achievements.stream()
                .collect(Collectors.toMap(
                        WalkSessionBingoAchievement::getBingoCellId,
                        WalkSessionBingoAchievement::getAchievedAt
                ));

        return boardIds.stream()
                .map(boardsById::get)
                .map(board -> toBoardResponse(
                        board,
                        cellsByBoardId.getOrDefault(board.getId(), List.of()),
                        missionsById,
                        achievedAtByCellId
                ))
                .toList();
    }

    private WalkSessionBingoBoardResponse toBoardResponse(
            BingoBoard board,
            List<BingoCell> cells,
            Map<Long, Mission> missionsById,
            Map<Long, Instant> achievedAtByCellId
    ) {
        List<WalkSessionBingoCellResponse> cellResponses = cells.stream()
                .sorted(Comparator.comparingInt(BingoCell::getRow).thenComparingInt(BingoCell::getCol))
                .map(cell -> WalkSessionBingoCellResponse.of(
                        cell,
                        getMission(missionsById, cell.getMissionId()),
                        achievedAtByCellId.get(cell.getId())
                ))
                .toList();
        return WalkSessionBingoBoardResponse.of(
                board,
                toInstant(board.getCreatedAt()),
                toInstant(board.getCompletedAt()),
                cellResponses
        );
    }

    private Room getRoom(Map<Long, Room> roomsById, Long roomId) {
        Room room = roomsById.get(roomId);
        if (room == null) {
            throw new CustomException(ErrorCode.ROOM_NOT_FOUND);
        }
        return room;
    }

    private Mission getMission(Map<Long, Mission> missionsById, Long missionId) {
        Mission mission = missionsById.get(missionId);
        if (mission == null) {
            throw new CustomException(ErrorCode.MISSION_NOT_FOUND);
        }
        return mission;
    }

    private Instant toInstant(LocalDateTime localDateTime) {
        if (localDateTime == null) {
            return null;
        }
        return localDateTime.atZone(SERVICE_ZONE_ID).toInstant();
    }
}
