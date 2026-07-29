package com.wecandoit.game.service;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.repository.BingoBoardRepository;
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
        return RoomDetailResponse.from(room, getRoomMemberResponses(
                room,
                roomMembers,
                getBingoBoardIdsByRoomMemberId(room)
        ));
    }

    public List<MyRoomResponse> getMyRooms(Long memberId) {
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
                .filter(roomMember -> roomsById.get(roomMember.getRoomId()).getStatus() != GameRoomStatus.CLOSED)
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

        return activeRoomMembers.stream()
                .map(roomMember -> MyRoomResponse.from(
                        roomsById.get(roomMember.getRoomId()),
                        roomMember,
                        membersByRoomId.getOrDefault(roomMember.getRoomId(), List.of())
                ))
                .toList();
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
                && room.getMode() != GameMode.BATTLE
                && room.getTargetStepCount() != null
                && room.getTargetStepCount() > 0;
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
        if (bingoBoard == null || roomMembers.isEmpty()) {
            return null;
        }
        return new StepGoalRewardTarget(
                room.getId(),
                bingoBoard.getId(),
                bingoBoard.getCreatedAt().toLocalDate(),
                room.getTargetStepCount(),
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
}
