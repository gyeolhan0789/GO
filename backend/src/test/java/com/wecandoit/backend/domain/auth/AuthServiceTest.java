package com.wecandoit.backend.domain.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.wecandoit.backend.common.exception.CustomException;
import com.wecandoit.backend.common.exception.ErrorCode;
import com.wecandoit.backend.common.jwt.JwtClaims;
import com.wecandoit.backend.common.jwt.JwtProvider;
import com.wecandoit.backend.common.jwt.JwtProperties;
import com.wecandoit.backend.common.jwt.TokenRepository;
import com.wecandoit.backend.domain.auth.TokenIssuer;
import com.wecandoit.backend.domain.auth.dto.AuthTokens;
import com.wecandoit.backend.domain.auth.dto.LoginRequest;
import com.wecandoit.backend.domain.member.Member;
import com.wecandoit.backend.domain.member.MemberRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("인증 서비스")
class AuthServiceTest {

    private final JwtProperties jwtProperties = new JwtProperties(
            "test-only-jwt-secret-key-please-change-me-1234567890",
            1_800_000L,
            1_209_600_000L
    );
    private final JwtProvider jwtProvider = new JwtProvider(jwtProperties);
    private final TokenRepository tokenRepository = Mockito.mock(TokenRepository.class);
    private final MemberRepository memberRepository = Mockito.mock(MemberRepository.class);
    private final PasswordEncoder passwordEncoder = Mockito.mock(PasswordEncoder.class);
    private final TokenIssuer tokenIssuer = new TokenIssuer(jwtProvider, tokenRepository, jwtProperties);
    private final AuthService authService = new AuthService(
            jwtProvider,
            tokenRepository,
            memberRepository,
            passwordEncoder,
            tokenIssuer
    );

    @Test
    @DisplayName("로그인 성공 시 발급한 Refresh Token을 회원 기준으로 저장한다")
    void loginStoresIssuedRefreshTokenForAuthenticatedMember() {
        Member member = Member.create("user@example.com", "encoded-password", "nickname");
        ReflectionTestUtils.setField(member, "id", 1L);

        when(memberRepository.findByEmail("user@example.com")).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("password", "encoded-password")).thenReturn(true);

        AuthTokens authTokens = authService.login(
                new LoginRequest("user@example.com", "password")
        );

        verify(tokenRepository).saveRefreshToken(1L, authTokens.refreshToken(), 1_209_600_000L);
    }

    @Test
    @DisplayName("존재하지 않는 이메일로 로그인하면 거부한다")
    void loginRejectsUnknownEmail() {
        when(memberRepository.findByEmail("user@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("user@example.com", "password")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_CREDENTIALS);
        verify(tokenRepository, never()).saveRefreshToken(Mockito.anyLong(), Mockito.anyString(), Mockito.anyLong());
    }

    @Test
    @DisplayName("비밀번호가 일치하지 않으면 로그인을 거부한다")
    void loginRejectsWrongPassword() {
        Member member = Member.create("user@example.com", "encoded-password", "nickname");
        ReflectionTestUtils.setField(member, "id", 1L);

        when(memberRepository.findByEmail("user@example.com")).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("wrong-password", "encoded-password")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("user@example.com", "wrong-password")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_CREDENTIALS);
        verify(tokenRepository, never()).saveRefreshToken(Mockito.anyLong(), Mockito.anyString(), Mockito.anyLong());
    }

    @Test
    @DisplayName("Access Token으로 재발급을 요청하면 거부한다")
    void reissueRejectsAccessToken() {
        String accessToken = jwtProvider.createAccessToken(1L, "USER");

        assertThatThrownBy(() -> authService.reissue(accessToken))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.REFRESH_TOKEN_INVALID);
        verify(tokenRepository, never()).findRefreshToken(Mockito.anyLong());
    }

    @Test
    @DisplayName("요청 Refresh Token이 저장된 값과 다르면 저장된 토큰을 삭제하고 재발급을 거부한다")
    void reissueDeletesStoredTokenAndRejectsOnMismatch() {
        Member member = Member.create("user@example.com", "encoded-password", "nickname");
        ReflectionTestUtils.setField(member, "id", 1L);
        String refreshToken = jwtProvider.createRefreshToken(1L, member.getRole().name());

        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(tokenRepository.findRefreshToken(1L)).thenReturn(Optional.of("other-refresh-token"));

        assertThatThrownBy(() -> authService.reissue(refreshToken))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.REFRESH_TOKEN_INVALID);
        verify(tokenRepository).deleteRefreshToken(1L);
        verify(tokenRepository, never()).saveRefreshToken(Mockito.anyLong(), Mockito.anyString(), Mockito.anyLong());
    }

    @Test
    @DisplayName("저장된 Refresh Token과 일치하면 새 토큰으로 회전 저장한다")
    void reissueRotatesStoredRefreshTokenWhenTokenMatches() {
        Member member = Member.create("user@example.com", "encoded-password", "nickname");
        ReflectionTestUtils.setField(member, "id", 1L);
        String refreshToken = jwtProvider.createRefreshToken(1L, member.getRole().name());

        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(tokenRepository.findRefreshToken(1L)).thenReturn(Optional.of(refreshToken));

        AuthTokens authTokens = authService.reissue(refreshToken);

        assertThat(authTokens.refreshToken()).isNotEqualTo(refreshToken);
        verify(tokenRepository).saveRefreshToken(1L, authTokens.refreshToken(), 1_209_600_000L);
    }

    @Test
    @DisplayName("로그아웃 시 저장된 Refresh Token을 삭제하고 Access Token을 블랙리스트에 등록한다")
    void logoutDeletesStoredRefreshTokenAndBlacklistsAccessToken() {
        String accessToken = jwtProvider.createAccessToken(1L, "USER");

        authService.logout(1L, accessToken);

        verify(tokenRepository).deleteRefreshToken(1L);
        ArgumentCaptor<JwtClaims> claimsCaptor = ArgumentCaptor.forClass(JwtClaims.class);
        verify(tokenRepository).blacklistAccessToken(claimsCaptor.capture());
        assertThat(claimsCaptor.getValue().memberId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("로그아웃 시 Access Token이 유효하지 않으면 블랙리스트 등록을 건너뛴다")
    void logoutSkipsBlacklistingWhenAccessTokenIsInvalid() {
        authService.logout(1L, "invalid-token");

        verify(tokenRepository).deleteRefreshToken(1L);
        verify(tokenRepository, never()).blacklistAccessToken(Mockito.any());
    }
}
