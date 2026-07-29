package com.wecandoit.game.service;

import com.wecandoit.bingo.service.BingoCommandService;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.controller.request.CreateRoomRequest;
import com.wecandoit.game.controller.response.CreateRoomResponse;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.notification.event.NotificationMessageFactory;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class RoomCommandService {

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final GameRepository gameRepository;
    private final BingoCommandService bingoCommandService;
    private final MemberRepository memberRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationMessageFactory notificationMessageFactory;

    public CreateRoomResponse createRoom(Long memberId, CreateRoomRequest request) {
        validateTargetBingoCount(request.targetBingoCount());
        validateTargetStepCount(request.mode(), request.targetStepCount());
        if (request.mode() == GameMode.SINGLE) {
            return startSingleRoom(memberId, request);
        }

        Room room = createNewRoom(memberId, request);
        // TODO: Connect game requests after policy is confirmed.
        return CreateRoomResponse.from(room);
    }

    private CreateRoomResponse startSingleRoom(Long memberId, CreateRoomRequest request) {
        memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        return roomRepository.findFirstByMemberIdAndModeAndStatus(
                        memberId,
                        GameMode.SINGLE,
                        GameRoomStatus.IN_PROGRESS
                )
                .map(CreateRoomResponse::from)
                .orElseGet(() -> createAndStartSingleRoom(memberId, request));
    }

    private CreateRoomResponse createAndStartSingleRoom(Long memberId, CreateRoomRequest request) {
        Room room = createNewRoom(memberId, request);
        room.start();
        Game game = gameRepository.save(Game.start(room.getId()));
        bingoCommandService.generateInitialBoard(room, game.getId());
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
        room.updateParticipantStatus(1);
        return room;
    }

    private void validateTargetBingoCount(Integer targetBingoCount) {
        if (targetBingoCount == null) {
            throw new CustomException(ErrorCode.ROOM_TARGET_BINGO_COUNT_REQUIRED);
        }
    }

    private void validateTargetStepCount(GameMode mode, Integer targetStepCount) {
        if (mode != GameMode.BATTLE && (targetStepCount == null || targetStepCount < 1)) {
            throw new CustomException(ErrorCode.ROOM_TARGET_STEP_COUNT_REQUIRED);
        }
        if (mode == GameMode.BATTLE && targetStepCount != null) {
            throw new CustomException(ErrorCode.ROOM_TARGET_STEP_COUNT_NOT_ALLOWED);
        }
    }

    public void deleteRoom(Long memberId, Long roomId) {
        Room room = findRoom(roomId);
        if (!room.isHost(memberId)) {
            throw new CustomException(ErrorCode.ROOM_DELETE_FORBIDDEN);
        }

        if (room.getMode() == GameMode.SINGLE) {
            room.close();
            return;
        }

        closeRoom(roomId, room);
        // TODO: Connect game requests, bingo boards, and mission policies after deletion is confirmed.
    }

    public void expireSingleRoom(Long roomId, LocalDateTime expirationTime) {
        Room room = findRoom(roomId);
        if (room.getMode() != GameMode.SINGLE
                || room.getStatus() != GameRoomStatus.IN_PROGRESS
                || room.getStartedAt() == null
                || room.getStartedAt().isAfter(expirationTime)) {
            return;
        }

        room.close();
    }

    public void startGame(Long memberId, Long roomId) {
        Room room = findRoom(roomId);
        validateRoomOpen(room);
        validateRoomMember(memberId, roomId);
        if (!room.isHost(memberId)) {
            throw new CustomException(ErrorCode.ROOM_START_FORBIDDEN);
        }
        if (room.getMode() == GameMode.BATTLE && room.getTargetBingoCount() == null) {
            throw new CustomException(ErrorCode.ROOM_TARGET_BINGO_COUNT_REQUIRED);
        }

        long participantCount = roomMemberRepository.countByRoomId(roomId);
        if (participantCount < room.getMode().getMinimumParticipants()) {
            throw new CustomException(ErrorCode.ROOM_MINIMUM_PARTICIPANTS_REQUIRED);
        }
        if (participantCount > room.getMode().getMaximumParticipants()) {
            throw new CustomException(ErrorCode.ROOM_MAXIMUM_PARTICIPANTS_REACHED);
        }
        if (!room.isReady()) {
            throw new CustomException(ErrorCode.ROOM_NOT_READY);
        }

        List<RoomMember> roomMembers = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(roomId);
        room.start();
        Game game = gameRepository.save(Game.start(roomId));
        if (room.getMode() == GameMode.BATTLE) {
            bingoCommandService.generateBattleBoards(room, game.getId(), roomMembers);
        } else {
            bingoCommandService.generateInitialBoard(room, game.getId());
        }

        roomMembers.stream()
                .map(RoomMember::getMemberId)
                .filter(participantId -> !participantId.equals(memberId))
                .forEach(participantId ->
                        eventPublisher.publishEvent(notificationMessageFactory.walkStart(participantId)));
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

        long participantCount = roomMemberRepository.countByRoomId(roomId);
        roomMemberRepository.delete(roomMember);
        room.updateParticipantStatus(participantCount - 1);
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

    private void validateRoomMember(Long memberId, Long roomId) {
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN);
        }
    }

    private void closeRoom(Long roomId, Room room) {
        room.close();
        roomMemberRepository.deleteAllByRoomId(roomId);
    }
}
