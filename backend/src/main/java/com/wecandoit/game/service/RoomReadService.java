package com.wecandoit.game.service;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.controller.response.MyRoomMemberResponse;
import com.wecandoit.game.controller.response.MyRoomResponse;
import com.wecandoit.game.controller.response.RoomDetailResponse;
import com.wecandoit.game.controller.response.RoomMemberResponse;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameParticipant;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.member.service.MemberReadService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoomReadService {

    private static final List<BingoBoardStatus> INACTIVE_BOARD_STATUSES =
            List.of(BingoBoardStatus.COMPLETED, BingoBoardStatus.EXPIRED);

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final GameRepository gameRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final MemberReadService memberReadService;
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;

    public RoomDetailResponse getRoomDetail(Long memberId, Long roomId) {
        Room room = findRoom(roomId);
        validateRoomOpen(room);
        validateRoomMember(memberId, roomId);

        List<RoomMember> roomMembers = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(roomId);
        RoomCycleSnapshot snapshot = getRoomCycleSnapshot(room);
        return RoomDetailResponse.from(
                room,
                snapshot.boardSize(),
                snapshot.targetBingoCount(),
                snapshot.targetStepCount(),
                snapshot.missionProgress().totalMissionCount(),
                snapshot.missionProgress().completedMissionCount(),
                snapshot.startedAt(),
                getRoomMemberResponses(room, roomMembers, snapshot)
        );
    }

    public List<MyRoomResponse> getMyRooms(Long memberId) {
        return getMyRooms(memberId, null);
    }

    public List<MyRoomResponse> getMyRooms(Long memberId, GameMode mode) {
        List<RoomMember> myRoomMembers = roomMemberRepository.findAllByMemberIdOrderByJoinedAtDesc(memberId);
        if (myRoomMembers.isEmpty()) {
            return List.of();
        }

        List<Long> roomIds = myRoomMembers.stream().map(RoomMember::getRoomId).distinct().toList();
        Map<Long, Room> roomsById = getRoomsById(roomIds);
        List<RoomMember> activeRoomMembers = myRoomMembers.stream()
                .filter(roomMember -> isActiveRoomWithMode(roomsById.get(roomMember.getRoomId()), mode))
                .toList();
        if (activeRoomMembers.isEmpty()) {
            return List.of();
        }

        List<Long> activeRoomIds = activeRoomMembers.stream().map(RoomMember::getRoomId).distinct().toList();
        List<RoomMember> allRoomMembers = roomMemberRepository.findAllByRoomIdInOrderByJoinedAtAsc(activeRoomIds);
        Map<Long, String> nicknamesByMemberId = getNicknamesByMemberId(allRoomMembers);
        Map<Long, List<MyRoomMemberResponse>> membersByRoomId =
                getMembersByRoomId(roomsById, allRoomMembers, nicknamesByMemberId);
        Map<Long, RoomCycleSnapshot> snapshotsByRoomId = getRoomCycleSnapshots(activeRoomIds, roomsById);

        return activeRoomMembers.stream()
                .map(roomMember -> {
                    Long roomId = roomMember.getRoomId();
                    Room room = roomsById.get(roomId);
                    RoomCycleSnapshot snapshot = snapshotsByRoomId.get(roomId);
                    return MyRoomResponse.from(
                            room,
                            roomMember,
                            snapshot.boardSize(),
                            snapshot.targetBingoCount(),
                            snapshot.targetStepCount(),
                            snapshot.missionProgress().totalMissionCount(),
                            snapshot.missionProgress().completedMissionCount(),
                            membersByRoomId.getOrDefault(roomId, List.of())
                    );
                })
                .toList();
    }

    public List<RoomMemberResponse> getRoomMembers(Long memberId, Long roomId) {
        Room room = findRoom(roomId);
        validateRoomOpen(room);
        validateRoomMember(memberId, roomId);
        List<RoomMember> roomMembers = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(roomId);
        return getRoomMemberResponses(room, roomMembers, getRoomCycleSnapshot(room));
    }

    public List<StepGoalRewardTarget> getStepGoalRewardTargets(Long memberId) {
        List<Long> participatingRoomIds = roomMemberRepository.findAllByMemberIdOrderByJoinedAtDesc(memberId).stream()
                .map(RoomMember::getRoomId)
                .distinct()
                .toList();
        if (participatingRoomIds.isEmpty()) {
            return List.of();
        }

        List<Room> targetRooms = roomRepository.findAllById(participatingRoomIds).stream()
                .filter(room -> room.getStatus() == RoomStatus.ACTIVE && room.getMode() != GameMode.BATTLE)
                .toList();
        if (targetRooms.isEmpty()) {
            return List.of();
        }

        List<Long> targetRoomIds = targetRooms.stream().map(Room::getId).toList();
        Map<Long, Game> activeGamesByRoomId = gameRepository
                .findAllByRoomIdInAndStatus(targetRoomIds, GameStatus.ACTIVE)
                .stream()
                .collect(Collectors.toMap(
                        Game::getRoomId,
                        Function.identity(),
                        (first, second) -> first.getId() > second.getId() ? first : second
                ));
        Map<Long, BingoBoard> activeBoardsByGameId = bingoBoardRepository
                .findAllByGameIdInAndStatusNotInOrderByIdAsc(
                        activeGamesByRoomId.values().stream().map(Game::getId).toList(),
                        INACTIVE_BOARD_STATUSES
                )
                .stream()
                .filter(BingoBoard::isShared)
                .collect(Collectors.toMap(
                        BingoBoard::getGameId,
                        Function.identity(),
                        (first, second) -> second
                ));
        Map<Long, List<RoomMember>> roomMembersByRoomId = roomMemberRepository
                .findAllByRoomIdInOrderByJoinedAtAsc(targetRoomIds)
                .stream()
                .collect(Collectors.groupingBy(RoomMember::getRoomId));

        return targetRooms.stream()
                .map(room -> toStepGoalRewardTarget(
                        room,
                        activeGamesByRoomId.get(room.getId()),
                        activeBoardsByGameId,
                        roomMembersByRoomId
                ))
                .filter(target -> target != null)
                .sorted((first, second) -> first.bingoBoardId().compareTo(second.bingoBoardId()))
                .toList();
    }

    private StepGoalRewardTarget toStepGoalRewardTarget(
            Room room,
            Game game,
            Map<Long, BingoBoard> activeBoardsByGameId,
            Map<Long, List<RoomMember>> roomMembersByRoomId
    ) {
        if (game == null) {
            return null;
        }
        BingoBoard board = activeBoardsByGameId.get(game.getId());
        List<RoomMember> roomMembers = roomMembersByRoomId.getOrDefault(room.getId(), List.of());
        if (board == null || board.getTargetStepCount() == null || roomMembers.isEmpty()) {
            return null;
        }
        return new StepGoalRewardTarget(
                room.getId(),
                board.getId(),
                board.getCreatedAt().toLocalDate(),
                board.getTargetStepCount(),
                roomMembers.stream()
                        .map(roomMember -> new StepGoalRewardMember(
                                roomMember.getMemberId(),
                                roomMember.getJoinedAt().toLocalDate()
                        ))
                        .toList()
        );
    }

    private RoomCycleSnapshot getRoomCycleSnapshot(Room room) {
        Game game = gameRepository.findFirstByRoomIdOrderByIdDesc(room.getId()).orElse(null);
        if (game == null) {
            return RoomCycleSnapshot.initial(room);
        }
        List<BingoBoard> boards = bingoBoardRepository.findAllByGameIdOrderByIdAsc(game.getId());
        Map<Long, List<BingoCell>> cellsByBoardId = getCellsByBoardId(
                boards.stream().map(BingoBoard::getId).toList()
        );
        Map<Long, Long> participantMemberIdsById = gameParticipantRepository
                .findAllByGameIdOrderByJoinedAtAsc(game.getId())
                .stream()
                .collect(Collectors.toMap(GameParticipant::getId, GameParticipant::getMemberId));
        return RoomCycleSnapshot.from(room, game, boards, cellsByBoardId, participantMemberIdsById);
    }

    private Map<Long, RoomCycleSnapshot> getRoomCycleSnapshots(
            List<Long> roomIds,
            Map<Long, Room> roomsById
    ) {
        Map<Long, Game> latestGamesByRoomId = gameRepository.findAllByRoomIdIn(roomIds).stream()
                .collect(Collectors.toMap(
                        Game::getRoomId,
                        Function.identity(),
                        (first, second) -> first.getId() > second.getId() ? first : second
                ));
        List<BingoBoard> boards = bingoBoardRepository.findAllByGameIdInOrderByIdAsc(
                latestGamesByRoomId.values().stream().map(Game::getId).toList()
        );
        Map<Long, List<BingoBoard>> boardsByGameId = boards.stream()
                .collect(Collectors.groupingBy(BingoBoard::getGameId));
        Map<Long, List<BingoCell>> cellsByBoardId = getCellsByBoardId(
                boards.stream().map(BingoBoard::getId).toList()
        );
        Map<Long, Long> participantMemberIdsById = gameParticipantRepository
                .findAllByGameIdInOrderByJoinedAtAsc(
                        latestGamesByRoomId.values().stream().map(Game::getId).toList()
                )
                .stream()
                .collect(Collectors.toMap(GameParticipant::getId, GameParticipant::getMemberId));

        return roomIds.stream().collect(Collectors.toMap(
                Function.identity(),
                roomId -> {
                    Room room = roomsById.get(roomId);
                    Game game = latestGamesByRoomId.get(roomId);
                    if (game == null) {
                        return RoomCycleSnapshot.initial(room);
                    }
                    return RoomCycleSnapshot.from(
                            room,
                            game,
                            boardsByGameId.getOrDefault(game.getId(), List.of()),
                            cellsByBoardId,
                            participantMemberIdsById
                    );
                }
        ));
    }

    private Map<Long, List<BingoCell>> getCellsByBoardId(List<Long> boardIds) {
        if (boardIds.isEmpty()) {
            return Map.of();
        }
        return bingoCellRepository.findAllByBoardIdIn(boardIds).stream()
                .collect(Collectors.groupingBy(BingoCell::getBoardId));
    }

    private List<RoomMemberResponse> getRoomMemberResponses(
            Room room,
            List<RoomMember> roomMembers,
            RoomCycleSnapshot snapshot
    ) {
        if (roomMembers.isEmpty()) {
            return List.of();
        }
        Map<Long, String> nicknamesByMemberId = getNicknamesByMemberId(roomMembers);
        return roomMembers.stream()
                .map(roomMember -> RoomMemberResponse.from(
                        roomMember,
                        getNickname(nicknamesByMemberId, roomMember.getMemberId()),
                        room.isHost(roomMember.getMemberId()),
                        snapshot.completedCountByMemberId().getOrDefault(roomMember.getMemberId(), 0),
                        snapshot.battleBoardIdByMemberId().get(roomMember.getMemberId())
                ))
                .toList();
    }

    private boolean isActiveRoomWithMode(Room room, GameMode mode) {
        return room != null
                && room.getStatus() == RoomStatus.ACTIVE
                && (mode == null || room.getMode() == mode);
    }

    private Room findRoom(Long roomId) {
        return roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
    }

    private void validateRoomMember(Long memberId, Long roomId) {
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN);
        }
    }

    private void validateRoomOpen(Room room) {
        if (room.getStatus() == RoomStatus.CLOSED) {
            throw new CustomException(ErrorCode.ROOM_CLOSED);
        }
    }

    private Map<Long, Room> getRoomsById(List<Long> roomIds) {
        Map<Long, Room> roomsById = roomRepository.findAllById(roomIds).stream()
                .collect(Collectors.toMap(Room::getId, Function.identity()));
        if (roomsById.size() != roomIds.size()) {
            throw new CustomException(ErrorCode.ROOM_NOT_FOUND);
        }
        return roomsById;
    }

    private Map<Long, List<MyRoomMemberResponse>> getMembersByRoomId(
            Map<Long, Room> roomsById,
            List<RoomMember> roomMembers,
            Map<Long, String> nicknamesByMemberId
    ) {
        return roomMembers.stream()
                .collect(Collectors.groupingBy(
                        RoomMember::getRoomId,
                        Collectors.mapping(
                                roomMember -> MyRoomMemberResponse.from(
                                        roomMember,
                                        getNickname(nicknamesByMemberId, roomMember.getMemberId()),
                                        roomsById.get(roomMember.getRoomId()).isHost(roomMember.getMemberId())
                                ),
                                Collectors.toList()
                        )
                ));
    }

    private Map<Long, String> getNicknamesByMemberId(List<RoomMember> roomMembers) {
        return memberReadService.getNicknamesByIds(roomMembers.stream()
                .map(RoomMember::getMemberId)
                .distinct()
                .toList());
    }

    private String getNickname(Map<Long, String> nicknamesByMemberId, Long memberId) {
        String nickname = nicknamesByMemberId.get(memberId);
        if (nickname == null) {
            throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        }
        return nickname;
    }

    public record StepGoalRewardTarget(
            Long roomId,
            Long bingoBoardId,
            LocalDate boardStartedDate,
            int targetStepCount,
            List<StepGoalRewardMember> members
    ) {
    }

    public record StepGoalRewardMember(
            Long memberId,
            LocalDate joinedDate
    ) {
    }

    private record MissionProgress(int totalMissionCount, int completedMissionCount) {
    }

    private record RoomCycleSnapshot(
            int boardSize,
            Integer targetBingoCount,
            Integer targetStepCount,
            LocalDateTime startedAt,
            MissionProgress missionProgress,
            Map<Long, Long> battleBoardIdByMemberId,
            Map<Long, Integer> completedCountByMemberId
    ) {

        private static RoomCycleSnapshot initial(Room room) {
            int totalMissionCount = room.getBoardSize() * room.getBoardSize();
            return new RoomCycleSnapshot(
                    room.getBoardSize(),
                    room.getTargetBingoCount(),
                    room.getTargetStepCount(),
                    null,
                    new MissionProgress(totalMissionCount, 0),
                    Map.of(),
                    Map.of()
            );
        }

        private static RoomCycleSnapshot from(
                Room room,
                Game game,
                List<BingoBoard> boards,
                Map<Long, List<BingoCell>> cellsByBoardId,
                Map<Long, Long> participantMemberIdsById
        ) {
            if (boards.isEmpty()) {
                return initial(room);
            }
            BingoBoard configurationBoard = boards.get(0);
            int totalMissionCount = 0;
            int completedMissionCount = 0;
            Map<Long, Long> boardIdsByMemberId = new HashMap<>();
            Map<Long, Integer> completedCountsByMemberId = new HashMap<>();

            for (BingoBoard board : boards) {
                List<BingoCell> cells = cellsByBoardId.getOrDefault(board.getId(), List.of());
                totalMissionCount += cells.size();
                int boardCompletedCount = (int) cells.stream()
                        .filter(cell -> cell.getCompletedAt() != null)
                        .count();
                completedMissionCount += boardCompletedCount;

                if (board.isPersonal()) {
                    Long memberId = participantMemberIdsById.get(board.getGameParticipantId());
                    if (memberId == null) {
                        throw new CustomException(ErrorCode.GAME_PARTICIPANT_NOT_FOUND);
                    }
                    boardIdsByMemberId.put(memberId, board.getId());
                    completedCountsByMemberId.put(memberId, boardCompletedCount);
                } else {
                    cells.stream()
                            .filter(cell -> cell.getCompletedAt() != null && cell.getMemberId() != null)
                            .forEach(cell -> completedCountsByMemberId.merge(cell.getMemberId(), 1, Integer::sum));
                }
            }

            return new RoomCycleSnapshot(
                    configurationBoard.getBoardSize(),
                    configurationBoard.getTargetBingoCount(),
                    configurationBoard.getTargetStepCount(),
                    game.getStartedAt(),
                    new MissionProgress(totalMissionCount, completedMissionCount),
                    Map.copyOf(boardIdsByMemberId),
                    Map.copyOf(completedCountsByMemberId)
            );
        }
    }
}
