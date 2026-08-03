package com.wecandoit.common.websocket;

import com.wecandoit.common.security.BearerTokenExtractor;
import com.wecandoit.common.security.JwtAuthenticator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WebSocketAuthenticationInterceptor implements ChannelInterceptor {

    private final JwtAuthenticator jwtAuthenticator;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() != StompCommand.CONNECT) {
            return message;
        }

        String accessToken = BearerTokenExtractor.extract(
                accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION)
        );
        accessor.setUser(jwtAuthenticator.authenticateAccessToken(accessToken));
        return message;
    }
}
