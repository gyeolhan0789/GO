package com.wecandoit.game.service;

import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.controller.request.CreateRoomRequest;
import com.wecandoit.game.controller.request.UpdateRoomNameRequest;
import com.wecandoit.game.controller.response.CreateRoomResponse;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class RoomCommandService {

    private static final String ACTIVE_GAME_RESOURCE = "active game";
    private static final String ACTIVE_BINGO_BOARD_RESOURCE = "active bingo board";
    private static final Logger log = LoggerFactory.getLogger(RoomCommandService.class);

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final GameRepository gameRepository;
    private final BingoBoardRepository bingoBoardRepository;
    private final GameCycleCommandService gameCycleCommandService;
    private final MemberRepository memberRepository;

    public CreateRoomResponse createRoom(Long memberId, CreateRoomRequest request) {
        validateBoardSettings(request);
        if (request.mode() == GameMode.SINGLE) {
            return createSingleRoom(memberId, request);
        }

        validateMemberExists(memberId);
        Room room = createNewRoom(memberId, request);
        if (request.mode() == GameMode.COOPERATE) {
            gameCycleCommandService.startInitialSharedCycle(
                    room,
                    roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(room.getId())
            );
        }
        return CreateRoomResponse.from(room);
    }

    private CreateRoomResponse createSingleRoom(Long memberId, CreateRoomRequest request) {
        memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        return roomRepository.findFirstByHostIdAndModeAndStatusOrderByIdDesc(
                        memberId,
                        GameMode.SINGLE,
                        RoomStatus.ACTIVE
                )
                .map(room -> {
                    validateSingleRoomCycle(room);
                    return CreateRoomResponse.from(room);
                })
                .orElseGet(() -> createAndStartSharedRoom(memberId, request));
    }

    private void validateMemberExists(Long memberId) {
        if (!memberRepository.existsById(memberId)) {
            throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        }
    }

    private void validateSingleRoomCycle(Room room) {
        Game game = gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(
                        room.getId(),
                        GameStatus.ACTIVE
                )
                .orElseThrow(() -> invalidRoomCycle(
                        room.getHostId(),
                        room.getId(),
                        ACTIVE_GAME_RESOURCE
                ));
        if (!bingoBoardRepository.existsByGameIdAndStatus(game.getId(), BingoBoardStatus.ACTIVE)) {
            throw invalidRoomCycle(
                    room.getHostId(),
                    room.getId(),
                    ACTIVE_BINGO_BOARD_RESOURCE
            );
        }
    }

    private CustomException invalidRoomCycle(Long memberId, Long roomId, String missingResource) {
        log.error(
                "Invalid active SINGLE room cycle: memberId={}, roomId={}, missing={}",
                memberId,
                roomId,
                missingResource
        );
        return new CustomException(ErrorCode.ROOM_CYCLE_INVALID);
    }

    private CreateRoomResponse createAndStartSharedRoom(Long memberId, CreateRoomRequest request) {
        Room room = createNewRoom(memberId, request);
        gameCycleCommandService.startInitialSharedCycle(
                room,
                roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(room.getId())
        );
        return CreateRoomResponse.from(room);
    }

    private Room createNewRoom(Long memberId, CreateRoomRequest request) {
        Room room = roomRepository.save(Room.create(
                memberId,
                request.name(),
                request.mode(),
                request.targetBingoCount(),
                request.targetStepCount(),
                request.boardSize()
        ));
        roomMemberRepository.save(RoomMember.create(room.getId(), memberId));
        return room;
    }

    public void updateRoomName(Long memberId, Long roomId, UpdateRoomNameRequest request) {
        Room room = findRoom(roomId);
        validateRoomOpen(room);
        if (!room.isHost(memberId)) {
            throw new CustomException(ErrorCode.ROOM_UPDATE_FORBIDDEN);
        }
        room.updateName(request.name());
    }

    public void deleteRoom(Long memberId, Long roomId) {
        Room room = findRoom(roomId);
        validateRoomOpen(room);
        if (!room.isHost(memberId)) {
            throw new CustomException(ErrorCode.ROOM_DELETE_FORBIDDEN);
        }
        closeRoom(roomId, room, memberId);
    }

    public void leaveRoom(Long memberId, Long roomId) {
        Room room = findRoom(roomId);
        validateRoomOpen(room);
        RoomMember roomMember = roomMemberRepository.findByRoomIdAndMemberId(roomId, memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN));

        if (room.isHost(memberId)) {
            closeRoom(roomId, room, memberId);
            return;
        }

        if (room.getMode() == GameMode.BATTLE) {
            gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(roomId, GameStatus.ACTIVE)
                    .ifPresent(game -> gameCycleCommandService.completeBattleByForfeit(
                            room,
                            game.getId(),
                            memberId
                    ));
        }
        roomMemberRepository.delete(roomMember);
    }

    private void closeRoom(Long roomId, Room room, Long hostId) {
        gameCycleCommandService.closeActiveCycle(room, hostId);
        room.close();
        roomMemberRepository.deleteAllByRoomId(roomId);
    }

    private Room findRoom(Long roomId) {
        return roomRepository.findByIdForUpdate(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
    }

    private void validateRoomOpen(Room room) {
        if (room.isClosed()) {
            throw new CustomException(ErrorCode.ROOM_CLOSED);
        }
    }

    private void validateBoardSettings(CreateRoomRequest request) {
        if (request.targetBingoCount() == null
                || request.targetBingoCount() > 2 * request.boardSize() + 2) {
            throw new CustomException(ErrorCode.BINGO_TARGET_COUNT_INVALID);
        }
        if (request.mode() != GameMode.BATTLE
                && (request.targetStepCount() == null || request.targetStepCount() < 1)) {
            throw new CustomException(ErrorCode.ROOM_TARGET_STEP_COUNT_REQUIRED);
        }
        if (request.mode() == GameMode.BATTLE && request.targetStepCount() != null) {
            throw new CustomException(ErrorCode.ROOM_TARGET_STEP_COUNT_NOT_ALLOWED);
        }
    }
}
