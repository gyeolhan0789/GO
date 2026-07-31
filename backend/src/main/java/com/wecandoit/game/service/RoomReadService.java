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
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.member.service.MemberReadService;
import java.time.LocalDate;
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
    private final MemberReadService memberReadService;
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;

    public RoomDetailResponse getRoomDetail(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN);
        }
        if (room.getStatus() == GameRoomStatus.CLOSED) {
            throw new CustomException(ErrorCode.ROOM_CLOSED);
        }

        List<RoomMember> roomMembers = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(roomId);
        MissionProgress missionProgress = getMissionProgress(room);
        return RoomDetailResponse.from(
                room,
                missionProgress.totalMissionCount(),
                missionProgress.completedMissionCount(),
                getRoomMemberResponses(
                        room,
                        roomMembers,
                        getBingoBoardIdsByRoomMemberId(room)
                )
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

        List<Long> roomIds = myRoomMembers.stream()
                .map(RoomMember::getRoomId)
                .distinct()
                .toList();
        Map<Long, Room> roomsById = getRoomsById(roomIds);
        List<RoomMember> activeRoomMembers = myRoomMembers.stream()
                .filter(roomMember -> isActiveRoomWithMode(roomsById.get(roomMember.getRoomId()), mode))
                .toList();
        if (activeRoomMembers.isEmpty()) {
            return List.of();
        }

        List<Long> activeRoomIds = activeRoomMembers.stream()
                .map(RoomMember::getRoomId)
                .distinct()
                .toList();
        List<RoomMember> allRoomMembers = roomMemberRepository.findAllByRoomIdInOrderByJoinedAtAsc(activeRoomIds);
        Map<Long, String> nicknamesByMemberId = getNicknamesByMemberId(allRoomMembers);
        Map<Long, List<MyRoomMemberResponse>> membersByRoomId = getMembersByRoomId(
                roomsById,
                allRoomMembers,
                nicknamesByMemberId
        );
        Map<Long, MissionProgress> missionProgressByRoomId = getMissionProgressByRoomId(activeRoomIds, roomsById);

        return activeRoomMembers.stream()
                .map(roomMember -> {
                    Long roomId = roomMember.getRoomId();
                    MissionProgress missionProgress = missionProgressByRoomId.get(roomId);
                    return MyRoomResponse.from(
                            roomsById.get(roomId),
                            roomMember,
                            missionProgress.totalMissionCount(),
                            missionProgress.completedMissionCount(),
                            membersByRoomId.getOrDefault(roomId, List.of())
                    );
                })
                .toList();
    }

    private boolean isActiveRoomWithMode(Room room, GameMode mode) {
        return room.getStatus() != GameRoomStatus.CLOSED
                && (mode == null || room.getMode() == mode);
    }

    public List<RoomMemberResponse> getRoomMembers(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN);
        }

        List<RoomMember> roomMembers = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(roomId);
        return getRoomMemberResponses(room, roomMembers, getBingoBoardIdsByRoomMemberId(room));
    }

    private MissionProgress getMissionProgress(Room room) {
        return gameRepository.findFirstByRoomIdOrderByIdDesc(room.getId())
                .map(game -> getMissionProgress(
                        room,
                        bingoBoardRepository.findAllByGameIdOrderByIdAsc(game.getId())
                ))
                .orElseGet(() -> MissionProgress.initial(room));
    }

    private Map<Long, MissionProgress> getMissionProgressByRoomId(
            List<Long> roomIds,
            Map<Long, Room> roomsById
    ) {
        Map<Long, Game> latestGamesByRoomId = gameRepository.findAllByRoomIdIn(roomIds).stream()
                .collect(Collectors.toMap(
                        Game::getRoomId,
                        Function.identity(),
                        (first, second) -> first.getId() > second.getId() ? first : second
                ));
        if (latestGamesByRoomId.isEmpty()) {
            return getInitialMissionProgressByRoomId(roomIds, roomsById);
        }

        List<BingoBoard> boards = bingoBoardRepository
                .findAllByGameIdInOrderByIdAsc(latestGamesByRoomId.values().stream()
                        .map(Game::getId)
                        .sorted()
                        .toList());
        Map<Long, List<BingoBoard>> boardsByGameId = boards.stream()
                .collect(Collectors.groupingBy(BingoBoard::getGameId));
        Map<Long, List<BingoCell>> cellsByBoardId = getCellsByBoardId(boards.stream()
                .map(BingoBoard::getId)
                .toList());

        return roomIds.stream()
                .collect(Collectors.toMap(
                        Function.identity(),
                        roomId -> getMissionProgress(
                                roomsById.get(roomId),
                                latestGamesByRoomId.get(roomId),
                                boardsByGameId,
                                cellsByBoardId
                        )
                ));
    }

    private Map<Long, MissionProgress> getInitialMissionProgressByRoomId(
            List<Long> roomIds,
            Map<Long, Room> roomsById
    ) {
        return roomIds.stream()
                .collect(Collectors.toMap(
                        Function.identity(),
                        roomId -> MissionProgress.initial(roomsById.get(roomId))
                ));
    }

    private MissionProgress getMissionProgress(
            Room room,
            Game game,
            Map<Long, List<BingoBoard>> boardsByGameId,
            Map<Long, List<BingoCell>> cellsByBoardId
    ) {
        if (game == null) {
            return MissionProgress.initial(room);
        }
        return getMissionProgress(room, boardsByGameId.getOrDefault(game.getId(), List.of()), cellsByBoardId);
    }

    private MissionProgress getMissionProgress(Room room, List<BingoBoard> boards) {
        return getMissionProgress(room, boards, getCellsByBoardId(boards.stream()
                .map(BingoBoard::getId)
                .toList()));
    }

    private MissionProgress getMissionProgress(
            Room room,
            List<BingoBoard> boards,
            Map<Long, List<BingoCell>> cellsByBoardId
    ) {
        if (boards.isEmpty()) {
            return MissionProgress.initial(room);
        }

        int totalMissionCount = 0;
        int completedMissionCount = 0;
        for (BingoBoard board : boards) {
            List<BingoCell> cells = cellsByBoardId.getOrDefault(board.getId(), List.of());
            totalMissionCount += cells.size();
            completedMissionCount += (int) cells.stream()
                    .filter(cell -> cell.getCompletedAt() != null)
                    .count();
        }
        if (totalMissionCount == 0) {
            return MissionProgress.initial(room);
        }
        return new MissionProgress(totalMissionCount, completedMissionCount);
    }

    private Map<Long, List<BingoCell>> getCellsByBoardId(List<Long> boardIds) {
        if (boardIds.isEmpty()) {
            return Map.of();
        }
        return bingoCellRepository.findAllByBoardIdIn(boardIds).stream()
                .collect(Collectors.groupingBy(BingoCell::getBoardId));
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
                .filter(this::isStepGoalRewardTarget)
                .toList();
        if (targetRooms.isEmpty()) {
            return List.of();
        }

        List<Long> targetRoomIds = targetRooms.stream()
                .map(Room::getId)
                .toList();
        Map<Long, Game> activeGamesByRoomId = gameRepository
                .findAllByRoomIdInAndStatus(targetRoomIds, GameStatus.IN_PROGRESS)
                .stream()
                .collect(Collectors.toMap(
                        Game::getRoomId,
                        Function.identity(),
                        (first, second) -> first.getId() > second.getId() ? first : second
                ));
        if (activeGamesByRoomId.isEmpty()) {
            return List.of();
        }

        Map<Long, BingoBoard> activeBoardsByGameId = bingoBoardRepository
                .findAllByGameIdInAndStatusNotInOrderByIdAsc(
                        activeGamesByRoomId.values().stream().map(Game::getId).toList(),
                        INACTIVE_BOARD_STATUSES
                )
                .stream()
                .filter(bingoBoard -> bingoBoard.getRoomMember() == null)
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

    private boolean isStepGoalRewardTarget(Room room) {
        return room.getStatus() == GameRoomStatus.IN_PROGRESS
                && room.getMode() != GameMode.BATTLE;
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
        BingoBoard bingoBoard = activeBoardsByGameId.get(game.getId());
        List<RoomMember> roomMembers = roomMembersByRoomId.getOrDefault(room.getId(), List.of());
        if (bingoBoard == null
                || bingoBoard.getTargetStepCount() == null
                || bingoBoard.getTargetStepCount() < 1
                || roomMembers.isEmpty()) {
            return null;
        }
        return new StepGoalRewardTarget(
                room.getId(),
                bingoBoard.getId(),
                bingoBoard.getCreatedAt().toLocalDate(),
                bingoBoard.getTargetStepCount(),
                roomMembers.stream()
                        .map(roomMember -> new StepGoalRewardMember(
                                roomMember.getMemberId(),
                                roomMember.getJoinedAt().toLocalDate()
                        ))
                        .toList()
        );
    }

    private List<RoomMemberResponse> getRoomMemberResponses(
            Room room,
            List<RoomMember> roomMembers,
            Map<Long, Long> bingoBoardIdsByRoomMemberId
    ) {
        if (roomMembers.isEmpty()) {
            return List.of();
        }

        Map<Long, String> nicknamesByMemberId = getNicknamesByMemberId(roomMembers);
        return roomMembers.stream()
                .map(roomMember -> RoomMemberResponse.from(
                        roomMember,
                        getNickname(nicknamesByMemberId, roomMember.getMemberId()),
                        room.getHostId().equals(roomMember.getMemberId()),
                        getBingoBoardId(bingoBoardIdsByRoomMemberId, roomMember)
                ))
                .toList();
    }

    private Long getBingoBoardId(Map<Long, Long> bingoBoardIdsByRoomMemberId, RoomMember roomMember) {
        if (bingoBoardIdsByRoomMemberId.isEmpty()) {
            return null;
        }
        return bingoBoardIdsByRoomMemberId.get(roomMember.getId());
    }

    private Map<Long, Long> getBingoBoardIdsByRoomMemberId(Room room) {
        if (room.getMode() != GameMode.BATTLE) {
            return Map.of();
        }
        Game game = gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(room.getId(), GameStatus.IN_PROGRESS)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_IN_PROGRESS));
        return bingoBoardRepository.findAllByGameIdOrderByIdAsc(game.getId()).stream()
                .filter(bingoBoard -> bingoBoard.getRoomMember() != null)
                .collect(Collectors.toMap(
                        bingoBoard -> bingoBoard.getRoomMember().getId(),
                        BingoBoard::getId
                ));
    }

    private Map<Long, Room> getRoomsById(List<Long> roomIds) {
        Map<Long, Room> roomsById = roomRepository.findAllById(roomIds).stream()
                .collect(Collectors.toMap(Room::getId, room -> room));
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
                                        roomsById.get(roomMember.getRoomId()).getHostId()
                                                .equals(roomMember.getMemberId())
                                ),
                                Collectors.toList()
                        )
                ));
    }

    private Map<Long, String> getNicknamesByMemberId(List<RoomMember> roomMembers) {
        List<Long> memberIds = roomMembers.stream()
                .map(RoomMember::getMemberId)
                .distinct()
                .toList();
        return memberReadService.getNicknamesByIds(memberIds);
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

    private record MissionProgress(
            int totalMissionCount,
            int completedMissionCount
    ) {

        private static MissionProgress initial(Room room) {
            return new MissionProgress(room.getBoardSize() * room.getBoardSize(), 0);
        }
    }
}
