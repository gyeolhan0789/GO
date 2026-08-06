package com.wecandoit.game.presence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.repository.RoomMemberRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

@DisplayName("방 Presence 구독 인터셉터")
@ExtendWith(MockitoExtension.class)
class RoomPresenceSubscriptionInterceptorTest {

    @Mock
    private RoomMemberRepository roomMemberRepository;
    @Mock
    private MessageChannel messageChannel;

    @Test
    @DisplayName("방 멤버가 Presence Topic을 구독하면 통과한다")
    void allowsRoomMemberPresenceSubscription() {
        // given
        RoomPresenceSubscriptionInterceptor interceptor =
                new RoomPresenceSubscriptionInterceptor(roomMemberRepository);
        Message<byte[]> message = subscribeMessage("/topic/rooms/10/presence", 1L);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);

        // when
        Message<?> result = interceptor.preSend(message, messageChannel);

        // then
        assertThat(result).isSameAs(message);
    }

    @Test
    @DisplayName("방 멤버가 아니면 Presence Topic 구독을 거부한다")
    void rejectsNonRoomMemberPresenceSubscription() {
        // given
        RoomPresenceSubscriptionInterceptor interceptor =
                new RoomPresenceSubscriptionInterceptor(roomMemberRepository);
        Message<byte[]> message = subscribeMessage("/topic/rooms/10/presence", 1L);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(false);

        // when
        CustomException exception = catchThrowableOfType(
                CustomException.class,
                () -> interceptor.preSend(message, messageChannel)
        );

        // then
        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.ROOM_MEMBER_FORBIDDEN);
    }

    @Test
    @DisplayName("Presence Topic이 아니면 방 멤버 검증을 하지 않는다")
    void ignoresNonPresenceSubscription() {
        // given
        RoomPresenceSubscriptionInterceptor interceptor =
                new RoomPresenceSubscriptionInterceptor(roomMemberRepository);
        Message<byte[]> message = subscribeMessage("/topic/rooms/10/bingo-progress", 1L);

        // when
        Message<?> result = interceptor.preSend(message, messageChannel);

        // then
        assertThat(result).isSameAs(message);
        then(roomMemberRepository).shouldHaveNoInteractions();
    }

    private Message<byte[]> subscribeMessage(String destination, Long memberId) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination(destination);
        accessor.setSessionId("session-1");
        accessor.setSubscriptionId("sub-1");
        accessor.setUser(UsernamePasswordAuthenticationToken.authenticated(memberId, null, List.of()));
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
