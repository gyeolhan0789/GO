package com.wecandoit.common.websocket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import com.wecandoit.common.jwt.JwtProvider;
import com.wecandoit.common.jwt.TokenRepository;
import java.lang.reflect.Type;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@DisplayName("WebSocket JWT 인증 통합")
class WebSocketAuthenticationIntegrationTest {

    private static final long CONNECTION_TIMEOUT_SECONDS = 5L;

    @LocalServerPort
    private int serverPort;
    @Autowired
    private JwtProvider jwtProvider;
    @MockitoBean
    private TokenRepository tokenRepository;
    private WebSocketStompClient stompClient;

    @BeforeEach
    void setUp() {
        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        stompClient.start();
    }

    @AfterEach
    void tearDown() {
        stompClient.stop();
    }

    @Test
    @DisplayName("유효한 Access Token으로 STOMP 연결을 완료한다")
    void connectsWithValidAccessToken() throws Exception {
        // given
        String accessToken = jwtProvider.createAccessToken(1L, "USER");
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);
        given(tokenRepository.isBlacklisted(anyString())).willReturn(false);

        // when
        StompSession session = stompClient.connectAsync(
                        webSocketUrl(),
                        new WebSocketHttpHeaders(),
                        connectHeaders,
                        new StompSessionHandlerAdapter() {
                        }
                )
                .get(CONNECTION_TIMEOUT_SECONDS, TimeUnit.SECONDS);

        // then
        assertThat(session.isConnected()).isTrue();
        session.disconnect();
    }

    @Test
    @DisplayName("Authorization 헤더가 없는 STOMP 연결을 거부한다")
    void rejectsConnectionWithoutAuthorizationHeader() throws Exception {
        // given
        ConnectionFailureHandler handler = new ConnectionFailureHandler();

        // when
        stompClient.connectAsync(
                webSocketUrl(),
                new WebSocketHttpHeaders(),
                new StompHeaders(),
                handler
        );
        Throwable failure = handler.failure().get(CONNECTION_TIMEOUT_SECONDS, TimeUnit.SECONDS);

        // then
        assertThat(failure).isNotNull();
        assertThat(handler.connected()).isFalse();
    }

    private String webSocketUrl() {
        return "ws://localhost:" + serverPort + WebSocketConfig.ENDPOINT;
    }

    private static class ConnectionFailureHandler extends StompSessionHandlerAdapter {

        private final CompletableFuture<Throwable> failure = new CompletableFuture<>();
        private final AtomicBoolean connected = new AtomicBoolean(false);

        @Override
        public Type getPayloadType(StompHeaders headers) {
            return byte[].class;
        }

        @Override
        public void handleFrame(StompHeaders headers, Object payload) {
            failure.complete(new IllegalStateException("STOMP ERROR frame received"));
        }

        @Override
        public void afterConnected(StompSession session, StompHeaders connectedHeaders) {
            connected.set(true);
        }

        @Override
        public void handleException(
                StompSession session,
                StompCommand command,
                StompHeaders headers,
                byte[] payload,
                Throwable exception
        ) {
            failure.complete(exception);
        }

        @Override
        public void handleTransportError(StompSession session, Throwable exception) {
            failure.complete(exception);
        }

        CompletableFuture<Throwable> failure() {
            return failure;
        }

        boolean connected() {
            return connected.get();
        }
    }
}
