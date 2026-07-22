package com.wecandoit.game.request.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.status.RequestStatus;
import com.wecandoit.friend.repository.FriendRepository;
import com.wecandoit.game.request.controller.request.GameRequestCreateRequest;
import com.wecandoit.game.request.controller.response.GameRequestCreateResponse;
import com.wecandoit.game.request.domain.GameRequest;
import com.wecandoit.game.request.repository.GameRequestRepository;
import com.wecandoit.game.room.domain.GameRoomStatus;
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
public class GameRequestService {

    private final GameRequestRepository gameRequestRepository;
    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final FriendRepository friendRepository;

    public GameRequestCreateResponse createGameRequest(
            Long memberId,
            Long roomId,
            GameRequestCreateRequest request
    ) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        validateInviter(memberId, roomId);
        validateRoomStatus(room.getStatus());

        Long inviteeId = request.inviteeId();
        validateInvitee(memberId, inviteeId, roomId);

        // TODO: 최대 방 인원과 초대 가능 인원 정책이 확정되면 검증을 추가한다.
        return gameRequestRepository
                .findFirstByRoomIdAndInviteeIdAndStatusOrderByCreatedAtDesc(
                        roomId,
                        inviteeId,
                        RequestStatus.PENDING
                )
                .map(gameRequest -> GameRequestCreateResponse.from(gameRequest, false))
                .orElseGet(() -> createRequest(roomId, memberId, inviteeId));
    }

    public void acceptGameRequest(Long memberId, Long roomId, Long requestId) {
        GameRequest gameRequest = findRequest(roomId, requestId);
        validateRequestInviteeAndPending(gameRequest, memberId);
        if (roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.GAME_REQUEST_ALREADY_ROOM_MEMBER);
        }

        gameRequest.accept();
        roomMemberRepository.save(RoomMember.create(roomId, memberId));
    }

    public void rejectGameRequest(Long memberId, Long roomId, Long requestId) {
        GameRequest gameRequest = findRequest(roomId, requestId);
        validateRequestInviteeAndPending(gameRequest, memberId);
        gameRequest.reject();
    }

    private void validateInviter(Long memberId, Long roomId) {
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.GAME_REQUEST_FORBIDDEN);
        }
    }

    private void validateRoomStatus(GameRoomStatus status) {
        if (status != GameRoomStatus.CREATED
                && status != GameRoomStatus.WAITING
                && status != GameRoomStatus.READY) {
            throw new CustomException(ErrorCode.GAME_REQUEST_NOT_AVAILABLE);
        }
    }

    private void validateInvitee(Long memberId, Long inviteeId, Long roomId) {
        if (memberId.equals(inviteeId)) {
            throw new CustomException(ErrorCode.GAME_REQUEST_SELF_INVITE);
        }
        if (roomMemberRepository.existsByRoomIdAndMemberId(roomId, inviteeId)) {
            throw new CustomException(ErrorCode.GAME_REQUEST_ALREADY_ROOM_MEMBER);
        }
        if (!friendRepository.existsBetween(memberId, inviteeId)) {
            throw new CustomException(ErrorCode.GAME_REQUEST_FRIEND_REQUIRED);
        }
    }

    private GameRequestCreateResponse createRequest(Long roomId, Long inviterId, Long inviteeId) {
        GameRequest gameRequest = gameRequestRepository.save(
                GameRequest.create(roomId, inviterId, inviteeId)
        );
        // TODO: 초대 만료와 알림(WebSocket 포함) 정책이 확정되면 연동한다.
        return GameRequestCreateResponse.from(gameRequest, true);
    }

    private GameRequest findRequest(Long roomId, Long requestId) {
        GameRequest gameRequest = gameRequestRepository.findById(requestId)
                .orElseThrow(() -> new CustomException(ErrorCode.GAME_REQUEST_NOT_FOUND));
        if (!gameRequest.isInRoom(roomId)) {
            throw new CustomException(ErrorCode.GAME_REQUEST_NOT_FOUND);
        }
        return gameRequest;
    }

    private void validateRequestInviteeAndPending(GameRequest gameRequest, Long memberId) {
        if (!gameRequest.isInvitee(memberId)) {
            throw new CustomException(ErrorCode.GAME_REQUEST_FORBIDDEN);
        }
        if (!gameRequest.isPending()) {
            throw new CustomException(ErrorCode.GAME_REQUEST_ALREADY_PROCESSED);
        }
    }
}
