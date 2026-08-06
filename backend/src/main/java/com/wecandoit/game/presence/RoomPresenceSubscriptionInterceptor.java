package com.wecandoit.game.presence;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.repository.RoomMemberRepository;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RoomPresenceSubscriptionInterceptor implements ChannelInterceptor {

    private final RoomMemberRepository roomMemberRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() != StompCommand.SUBSCRIBE) {
            return message;
        }

        RoomPresenceDestination.extractRoomId(accessor.getDestination())
                .ifPresent(roomId -> validateRoomMember(accessor.getUser(), roomId));
        return message;
    }

    private void validateRoomMember(Principal principal, Long roomId) {
        Long memberId = getMemberId(principal);
        if (memberId == null) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED);
        }
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN);
        }
    }

    private Long getMemberId(Principal principal) {
        if (principal instanceof Authentication authentication
                && authentication.getPrincipal() instanceof Long memberId) {
            return memberId;
        }
        return null;
    }
}
