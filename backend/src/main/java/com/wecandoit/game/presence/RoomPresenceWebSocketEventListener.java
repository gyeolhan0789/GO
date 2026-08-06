package com.wecandoit.game.presence;

import com.wecandoit.member.service.MemberReadService;
import java.security.Principal;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.socket.messaging.SessionUnsubscribeEvent;

@Slf4j
@Component
@RequiredArgsConstructor
public class RoomPresenceWebSocketEventListener {

    private final RoomPresenceRegistry presenceRegistry;
    private final MemberReadService memberReadService;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleSubscribe(SessionSubscribeEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        RoomPresenceDestination.extractRoomId(accessor.getDestination())
                .ifPresent(roomId -> handlePresenceSubscribe(accessor, roomId));
    }

    @EventListener
    public void handleUnsubscribe(SessionUnsubscribeEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        presenceRegistry.unsubscribe(accessor.getSessionId(), accessor.getSubscriptionId())
                .ifPresent(this::send);
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        presenceRegistry.disconnect(accessor.getSessionId()).forEach(this::send);
    }

    private void handlePresenceSubscribe(StompHeaderAccessor accessor, Long roomId) {
        Long memberId = getMemberId(accessor.getUser());
        if (memberId == null) {
            return;
        }

        RoomPresenceRegistry.Change change = presenceRegistry.subscribe(
                roomId,
                memberId,
                accessor.getSessionId(),
                accessor.getSubscriptionId()
        );
        send(change);
    }

    private void send(RoomPresenceRegistry.Change change) {
        RoomPresenceMessage message = toMessage(change);
        try {
            messagingTemplate.convertAndSend(
                    RoomPresenceDestination.destination(change.roomId()),
                    message
            );
        } catch (Exception exception) {
            log.error("Failed to send room presence event. roomId={}, memberId={}, type={}",
                    change.roomId(), change.memberId(), change.type(), exception);
        }
    }

    private RoomPresenceMessage toMessage(RoomPresenceRegistry.Change change) {
        List<RoomPresenceMember> onlineMembers = getOnlineMembers(change.onlineMemberIds());
        return new RoomPresenceMessage(
                change.type(),
                change.roomId(),
                change.memberId(),
                onlineMembers.size(),
                onlineMembers
        );
    }

    private List<RoomPresenceMember> getOnlineMembers(List<Long> onlineMemberIds) {
        if (onlineMemberIds.isEmpty()) {
            return List.of();
        }

        Map<Long, String> nicknamesByMemberId = getNicknamesByMemberId(onlineMemberIds);
        return onlineMemberIds.stream()
                .map(memberId -> new RoomPresenceMember(
                        memberId,
                        nicknamesByMemberId.get(memberId)
                ))
                .toList();
    }

    private Map<Long, String> getNicknamesByMemberId(Collection<Long> memberIds) {
        return memberReadService.getNicknamesByIds(memberIds);
    }

    private Long getMemberId(Principal principal) {
        if (principal instanceof Authentication authentication
                && authentication.getPrincipal() instanceof Long memberId) {
            return memberId;
        }
        return null;
    }
}
