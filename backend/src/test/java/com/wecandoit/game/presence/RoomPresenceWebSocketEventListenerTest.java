package com.wecandoit.game.presence;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.member.service.MemberReadService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.socket.messaging.SessionUnsubscribeEvent;

@DisplayName("방 Presence WebSocket 이벤트 리스너")
@ExtendWith(MockitoExtension.class)
class RoomPresenceWebSocketEventListenerTest {

    @Mock
    private MemberReadService memberReadService;
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private RoomPresenceRegistry presenceRegistry;
    private RoomPresenceWebSocketEventListener listener;

    @BeforeEach
    void setUp() {
        presenceRegistry = new RoomPresenceRegistry();
        listener = new RoomPresenceWebSocketEventListener(
                presenceRegistry,
                memberReadService,
                messagingTemplate
        );
    }

    @Test
    @DisplayName("Presence Topic을 구독하면 현재 접속 목록을 방 Presence Topic으로 전송한다")
    void sendsPresenceMessageOnSubscribe() {
        // given
        given(memberReadService.getNicknamesByIds(any())).willReturn(Map.of(1L, "walker"));

        // when
        listener.handleSubscribe(new SessionSubscribeEvent(
                this,
                message(StompCommand.SUBSCRIBE, "/topic/rooms/10/presence", "session-1", "sub-1", 1L)
        ));

        // then
        RoomPresenceMessage expected = new RoomPresenceMessage(
                RoomPresenceEventType.JOINED,
                10L,
                1L,
                1,
                List.of(new RoomPresenceMember(1L, "walker"))
        );
        then(messagingTemplate).should().convertAndSend("/topic/rooms/10/presence", expected);
    }

    @Test
    @DisplayName("Presence Topic 구독을 해제하면 마지막 접속자인 경우 퇴장 이벤트를 전송한다")
    void sendsLeftMessageOnLastUnsubscribe() {
        // given
        given(memberReadService.getNicknamesByIds(any())).willReturn(Map.of(1L, "walker"));
        listener.handleSubscribe(new SessionSubscribeEvent(
                this,
                message(StompCommand.SUBSCRIBE, "/topic/rooms/10/presence", "session-1", "sub-1", 1L)
        ));

        // when
        listener.handleUnsubscribe(new SessionUnsubscribeEvent(
                this,
                message(StompCommand.UNSUBSCRIBE, null, "session-1", "sub-1", 1L)
        ));

        // then
        RoomPresenceMessage expected = new RoomPresenceMessage(
                RoomPresenceEventType.LEFT,
                10L,
                1L,
                0,
                List.of()
        );
        then(messagingTemplate).should().convertAndSend("/topic/rooms/10/presence", expected);
    }

    @Test
    @DisplayName("Presence가 아닌 Topic 구독은 무시한다")
    void ignoresNonPresenceSubscribe() {
        // when
        listener.handleSubscribe(new SessionSubscribeEvent(
                this,
                message(StompCommand.SUBSCRIBE, "/topic/rooms/10/bingo-progress", "session-1", "sub-1", 1L)
        ));

        // then
        then(messagingTemplate).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("연결이 끊기면 해당 세션의 Presence 구독을 제거하고 퇴장 이벤트를 전송한다")
    void sendsLeftMessageOnDisconnect() {
        // given
        given(memberReadService.getNicknamesByIds(any())).willReturn(Map.of(1L, "walker"));
        listener.handleSubscribe(new SessionSubscribeEvent(
                this,
                message(StompCommand.SUBSCRIBE, "/topic/rooms/10/presence", "session-1", "sub-1", 1L)
        ));

        // when
        listener.handleDisconnect(new SessionDisconnectEvent(
                this,
                message(StompCommand.DISCONNECT, null, "session-1", null, 1L),
                "session-1",
                CloseStatus.NORMAL
        ));

        // then
        RoomPresenceMessage expected = new RoomPresenceMessage(
                RoomPresenceEventType.LEFT,
                10L,
                1L,
                0,
                List.of()
        );
        then(messagingTemplate).should().convertAndSend("/topic/rooms/10/presence", expected);
    }

    private Message<byte[]> message(
            StompCommand command,
            String destination,
            String sessionId,
            String subscriptionId,
            Long memberId
    ) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setDestination(destination);
        accessor.setSessionId(sessionId);
        accessor.setSubscriptionId(subscriptionId);
        accessor.setUser(UsernamePasswordAuthenticationToken.authenticated(memberId, null, List.of()));
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
