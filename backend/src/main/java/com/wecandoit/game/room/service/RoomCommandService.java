package com.wecandoit.game.room.service;

import com.wecandoit.bingo.service.BingoCommandService;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.room.controller.request.CreateRoomRequest;
import com.wecandoit.game.room.controller.response.CreateRoomResponse;
import com.wecandoit.game.room.domain.GameMode;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.domain.RoomMember;
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class RoomCommandService {

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final BingoCommandService bingoCommandService;

    public CreateRoomResponse createRoom(Long memberId, CreateRoomRequest request) {
        validateTargetStepCount(request.mode(), request.targetStepCount());
        Room room = roomRepository.save(Room.create(
                memberId,
                request.mode(),
                request.targetBingoCount(),
                request.boardSize(),
                request.targetStepCount()
        ));
        roomMemberRepository.save(RoomMember.create(room.getId(), memberId));
        // TODO: Connect game requests after policy is confirmed.
        return CreateRoomResponse.from(room);
    }

    private void validateTargetStepCount(GameMode mode, Integer targetStepCount) {
        if (mode == GameMode.COOPERATE && targetStepCount == null) {
            throw new CustomException(ErrorCode.ROOM_TARGET_STEP_COUNT_REQUIRED);
        }
        if (mode == GameMode.SINGLE && targetStepCount != null) {
            throw new CustomException(ErrorCode.ROOM_TARGET_STEP_COUNT_NOT_ALLOWED);
        }
    }

    public void deleteRoom(Long memberId, Long roomId) {
        Room room = findRoom(roomId);
        if (!room.isHost(memberId)) {
            throw new CustomException(ErrorCode.ROOM_DELETE_FORBIDDEN);
        }

        closeRoom(roomId, room);
        // TODO: Connect game requests, bingo boards, and mission policies after deletion is confirmed.
    }

    public void startGame(Long memberId, Long roomId) {
        Room room = findRoom(roomId);
        if (!room.isHost(memberId)) {
            throw new CustomException(ErrorCode.ROOM_START_FORBIDDEN);
        }
        if (!room.isReady()) {
            throw new CustomException(ErrorCode.ROOM_NOT_READY);
        }

        room.start();
        bingoCommandService.generateInitialBoard(room);
    }

    public void leaveRoom(Long memberId, Long roomId) {
        Room room = findRoom(roomId);
        validateRoomOpen(room);
        RoomMember roomMember = roomMemberRepository.findByRoomIdAndMemberId(roomId, memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN));

        if (room.isHost(memberId)) {
            closeRoom(roomId, room);
            return;
        }

        roomMemberRepository.delete(roomMember);
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

    private void closeRoom(Long roomId, Room room) {
        room.close();
        roomMemberRepository.deleteAllByRoomId(roomId);
    }
}
