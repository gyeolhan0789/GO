package com.wecandoit.common.websocket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.jwt.JwtProperties;
import com.wecandoit.common.jwt.JwtProvider;
import com.wecandoit.common.jwt.TokenRepository;
import com.wecandoit.common.security.JwtAuthenticator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;

@DisplayName("WebSocket JWT 인증 인터셉터")
@ExtendWith(MockitoExtension.class)
class WebSocketAuthenticationInterceptorTest {

    private final JwtProvider jwtProvider = new JwtProvider(
            jwtProperties(1_800_000L, 1_209_600_000L)
    );
    @Mock
    private TokenRepository tokenRepository;
    @Mock
    private MessageChannel messageChannel;
    private WebSocketAuthenticationInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new WebSocketAuthenticationInterceptor(new JwtAuthenticator(jwtProvider, tokenRepository));
    }

    @Test
    @DisplayName("유효한 Access Token으로 CONNECT하면 JWT claims 기반 인증 정보를 설정한다")
    void authenticatesConnectWithAccessToken() {
        // given
        String accessToken = jwtProvider.createAccessToken(1L, "USER");
        Message<byte[]> message = connectMessage("Bearer " + accessToken);
        given(tokenRepository.isBlacklisted(anyString())).willReturn(false);

        // when
        Message<?> result = interceptor.preSend(message, messageChannel);

        // then
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(result);
        Authentication authentication = (Authentication) accessor.getUser();
        assertThat(authentication).isNotNull();
        assertThat(authentication.getPrincipal()).isEqualTo(1L);
        assertThat(authentication.getAuthorities())
                .extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_USER");
    }

    @Test
    @DisplayName("Authorization 헤더 없이 CONNECT하면 인증을 거부한다")
    void rejectsConnectWithoutAuthorizationHeader() {
        // given
        Message<byte[]> message = connectMessage(null);

        // when
        CustomException exception = catchThrowableOfType(
                CustomException.class,
                () -> interceptor.preSend(message, messageChannel)
        );

        // then
        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.UNAUTHENTICATED);
    }

    @Test
    @DisplayName("Refresh Token으로 CONNECT하면 인증을 거부한다")
    void rejectsConnectWithRefreshToken() {
        // given
        String refreshToken = jwtProvider.createRefreshToken(1L, "USER");
        Message<byte[]> message = connectMessage("Bearer " + refreshToken);

        // when
        CustomException exception = catchThrowableOfType(
                CustomException.class,
                () -> interceptor.preSend(message, messageChannel)
        );

        // then
        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.TOKEN_INVALID);
    }

    @Test
    @DisplayName("만료된 Access Token으로 CONNECT하면 인증을 거부한다")
    void rejectsConnectWithExpiredAccessToken() {
        // given
        JwtProvider expiringProvider = new JwtProvider(jwtProperties(-1L, 1_209_600_000L));
        WebSocketAuthenticationInterceptor expiringInterceptor =
                new WebSocketAuthenticationInterceptor(new JwtAuthenticator(expiringProvider, tokenRepository));
        String accessToken = expiringProvider.createAccessToken(1L, "USER");
        Message<byte[]> message = connectMessage("Bearer " + accessToken);

        // when
        CustomException exception = catchThrowableOfType(
                CustomException.class,
                () -> expiringInterceptor.preSend(message, messageChannel)
        );

        // then
        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.TOKEN_EXPIRED);
    }

    @Test
    @DisplayName("블랙리스트 Access Token으로 CONNECT하면 인증을 거부한다")
    void rejectsConnectWithBlacklistedAccessToken() {
        // given
        String accessToken = jwtProvider.createAccessToken(1L, "USER");
        Message<byte[]> message = connectMessage("Bearer " + accessToken);
        given(tokenRepository.isBlacklisted(anyString())).willReturn(true);

        // when
        CustomException exception = catchThrowableOfType(
                CustomException.class,
                () -> interceptor.preSend(message, messageChannel)
        );

        // then
        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.TOKEN_INVALID);
    }

    @Test
    @DisplayName("CONNECT가 아닌 프레임은 구독 권한 확장을 위해 인증 처리 없이 통과시킨다")
    void passesNonConnectFrameWithoutAuthentication() {
        // given
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        // when
        Message<?> result = interceptor.preSend(message, messageChannel);

        // then
        assertThat(result).isSameAs(message);
    }

    private Message<byte[]> connectMessage(String authorizationHeader) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        if (authorizationHeader != null) {
            accessor.addNativeHeader(HttpHeaders.AUTHORIZATION, authorizationHeader);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private JwtProperties jwtProperties(long accessTokenExpirationMillis, long refreshTokenExpirationMillis) {
        return new JwtProperties(
                "test-only-jwt-secret-key-please-change-me-1234567890",
                accessTokenExpirationMillis,
                refreshTokenExpirationMillis
        );
    }
}
