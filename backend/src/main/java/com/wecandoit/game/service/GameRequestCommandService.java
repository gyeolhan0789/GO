package com.wecandoit.game.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.status.RequestStatus;
import com.wecandoit.friend.repository.FriendRepository;
import com.wecandoit.game.controller.request.GameRequestCreateRequest;
import com.wecandoit.game.controller.response.GameRequestCreateResponse;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameRequest;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.event.BattleMatchingMessage;
import com.wecandoit.game.event.BattleMatchingMessageRequestedEvent;
import com.wecandoit.game.repository.GameRequestRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.notification.event.NotificationMessageFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class GameRequestCommandService {

    private final GameRequestRepository gameRequestRepository;
    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final GameCycleCommandService gameCycleCommandService;
    private final FriendRepository friendRepository;
    private final MemberRepository memberRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationMessageFactory notificationMessageFactory;

    public GameRequestCreateResponse createGameRequest(
            Long memberId,
            Long roomId,
            GameRequestCreateRequest request
    ) {
        Room room = findActiveRoomForUpdate(roomId);
        validateInviter(memberId, roomId);
        validateRoomCapacity(room, roomMemberRepository.countByRoomId(roomId));

        Long inviteeId = request.inviteeId();
        validateMemberExists(inviteeId);
        validateInvitee(memberId, inviteeId, roomId);

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
        Room room = findActiveRoomForUpdate(roomId);
        GameRequest gameRequest = findRequestForUpdate(roomId, requestId);
        validateRequestInviteeAndPending(gameRequest, memberId);
        if (roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.GAME_REQUEST_ALREADY_ROOM_MEMBER);
        }

        long participantCount = roomMemberRepository.countByRoomId(roomId);
        validateRoomCapacity(room, participantCount);
        gameRequest.accept();
        roomMemberRepository.save(RoomMember.create(roomId, memberId));
        List<RoomMember> roomMembers = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(roomId);
        if (room.getMode() == GameMode.BATTLE
                && roomMembers.size() == GameMode.BATTLE.getMaximumParticipants()) {
            gameCycleCommandService.startInitialBattleCycle(room, roomMembers);
            BattleMatchingMessage countdownStartedMessage = BattleMatchingMessage.battleCountdownStarted(
                    roomId,
                    requestId,
                    gameRequest.getInviterId(),
                    gameRequest.getInviteeId()
            );
            publishBattleMessage(gameRequest.getInviterId(), countdownStartedMessage);
            publishBattleMessage(gameRequest.getInviteeId(), countdownStartedMessage);
            return;
        }
        gameCycleCommandService.registerCurrentCycleParticipant(room, memberId);
    }

    public void rejectGameRequest(Long memberId, Long roomId, Long requestId) {
        Room room = findActiveRoomForUpdate(roomId);
        GameRequest gameRequest = findRequestForUpdate(roomId, requestId);
        validateRequestInviteeAndPending(gameRequest, memberId);
        gameRequest.reject();
        if (room.getMode() == GameMode.BATTLE) {
            publishBattleMessage(
                    gameRequest.getInviterId(),
                    BattleMatchingMessage.invitationRejected(
                            roomId,
                            requestId,
                            gameRequest.getInviterId(),
                            gameRequest.getInviteeId()
                    )
            );
        }
    }

    public void cancelGameRequest(Long memberId, Long roomId, Long requestId) {
        Room room = findActiveRoomForUpdate(roomId);
        GameRequest gameRequest = findRequestForUpdate(roomId, requestId);
        validateRequestInviterAndPending(gameRequest, memberId);
        gameRequest.cancel();
        if (room.getMode() == GameMode.BATTLE) {
            publishBattleMessage(
                    gameRequest.getInviteeId(),
                    BattleMatchingMessage.invitationCancelled(
                            roomId,
                            requestId,
                            gameRequest.getInviterId(),
                            gameRequest.getInviteeId()
                    )
            );
        }
    }

    private Room findActiveRoomForUpdate(Long roomId) {
        Room room = roomRepository.findByIdForUpdate(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        validateRoomStatus(room.getStatus());
        return room;
    }

    private void validateInviter(Long memberId, Long roomId) {
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.GAME_REQUEST_FORBIDDEN);
        }
    }

    private void validateRoomStatus(RoomStatus status) {
        if (status != RoomStatus.ACTIVE) {
            throw new CustomException(ErrorCode.GAME_REQUEST_NOT_AVAILABLE);
        }
    }

    private void validateRoomCapacity(Room room, long participantCount) {
        if (participantCount >= room.getMode().getMaximumParticipants()) {
            throw new CustomException(ErrorCode.ROOM_MAXIMUM_PARTICIPANTS_REACHED);
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

    private void validateMemberExists(Long memberId) {
        if (!memberRepository.existsById(memberId)) {
            throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        }
    }

    private GameRequestCreateResponse createRequest(Long roomId, Long inviterId, Long inviteeId) {
        GameRequest gameRequest = gameRequestRepository.save(
                GameRequest.create(roomId, inviterId, inviteeId)
        );
        eventPublisher.publishEvent(notificationMessageFactory.friendInvite(inviteeId));
        // TODO: 초대 만료 정책이 확정되면 연동한다.
        return GameRequestCreateResponse.from(gameRequest, true);
    }

    private void publishBattleMessage(Long recipientMemberId, BattleMatchingMessage message) {
        eventPublisher.publishEvent(new BattleMatchingMessageRequestedEvent(recipientMemberId, message));
    }

    private GameRequest findRequestForUpdate(Long roomId, Long requestId) {
        GameRequest gameRequest = gameRequestRepository.findByIdForUpdate(requestId)
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
        validateRequestPending(gameRequest);
    }

    private void validateRequestInviterAndPending(GameRequest gameRequest, Long memberId) {
        if (!gameRequest.isInviter(memberId)) {
            throw new CustomException(ErrorCode.GAME_REQUEST_FORBIDDEN);
        }
        validateRequestPending(gameRequest);
    }

    private void validateRequestPending(GameRequest gameRequest) {
        if (!gameRequest.isPending()) {
            throw new CustomException(ErrorCode.GAME_REQUEST_ALREADY_PROCESSED);
        }
    }
}
