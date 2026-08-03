package com.wecandoit.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.jwt.JwtClaims;
import com.wecandoit.common.jwt.JwtProvider;
import com.wecandoit.common.jwt.JwtProperties;
import com.wecandoit.common.jwt.TokenRepository;
import com.wecandoit.auth.dto.AuthTokens;
import com.wecandoit.auth.dto.LoginRequest;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("인증 서비스")
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private final JwtProperties jwtProperties = new JwtProperties(
            "test-only-jwt-secret-key-please-change-me-1234567890",
            1_800_000L,
            1_209_600_000L
    );
    private final JwtProvider jwtProvider = new JwtProvider(jwtProperties);
    @Mock
    private TokenRepository tokenRepository;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    private TokenIssuer tokenIssuer;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        tokenIssuer = new TokenIssuer(jwtProvider, tokenRepository, jwtProperties);
        authService = new AuthService(
                jwtProvider,
                tokenRepository,
                memberRepository,
                passwordEncoder,
                tokenIssuer
        );
    }

    @Test
    @DisplayName("로그인 성공 시 발급한 Refresh Token을 회원 기준으로 저장한다")
    void loginStoresIssuedRefreshTokenForAuthenticatedMember() {
        // given
        Member member = Member.create("user@example.com", "encoded-password", "nickname", null, Gender.MALE);
        ReflectionTestUtils.setField(member, "id", 1L);

        given(memberRepository.findByEmail("user@example.com")).willReturn(Optional.of(member));
        given(passwordEncoder.matches("password", "encoded-password")).willReturn(true);

        // when
        AuthTokens authTokens = authService.login(
                new LoginRequest("user@example.com", "password")
        );

        // then
        then(tokenRepository).should().saveRefreshToken(1L, authTokens.refreshToken(), 1_209_600_000L);
    }

    @Test
    @DisplayName("존재하지 않는 이메일로 로그인하면 거부한다")
    void loginRejectsUnknownEmail() {
        // given
        given(memberRepository.findByEmail("user@example.com")).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> authService.login(new LoginRequest("user@example.com", "password")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_CREDENTIALS);
        then(tokenRepository).should(never()).saveRefreshToken(Mockito.anyLong(), Mockito.anyString(), Mockito.anyLong());
    }

    @Test
    @DisplayName("비밀번호가 일치하지 않으면 로그인을 거부한다")
    void loginRejectsWrongPassword() {
        // given
        Member member = Member.create("user@example.com", "encoded-password", "nickname", null, Gender.MALE);
        ReflectionTestUtils.setField(member, "id", 1L);

        given(memberRepository.findByEmail("user@example.com")).willReturn(Optional.of(member));
        given(passwordEncoder.matches("wrong-password", "encoded-password")).willReturn(false);

        // when & then
        assertThatThrownBy(() -> authService.login(new LoginRequest("user@example.com", "wrong-password")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_CREDENTIALS);
        then(tokenRepository).should(never()).saveRefreshToken(Mockito.anyLong(), Mockito.anyString(), Mockito.anyLong());
    }

    @Test
    @DisplayName("Access Token으로 재발급을 요청하면 거부한다")
    void reissueRejectsAccessToken() {
        // given
        String accessToken = jwtProvider.createAccessToken(1L, "USER");

        // when & then
        assertThatThrownBy(() -> authService.reissue(accessToken))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.REFRESH_TOKEN_INVALID);
        then(tokenRepository).should(never()).findRefreshToken(Mockito.anyLong());
    }

    @Test
    @DisplayName("요청 Refresh Token이 저장된 값과 다르면 저장된 토큰을 삭제하고 재발급을 거부한다")
    void reissueDeletesStoredTokenAndRejectsOnMismatch() {
        // given
        Member member = Member.create("user@example.com", "encoded-password", "nickname", null, Gender.MALE);
        ReflectionTestUtils.setField(member, "id", 1L);
        String refreshToken = jwtProvider.createRefreshToken(1L, member.getRole().name());

        given(memberRepository.findById(1L)).willReturn(Optional.of(member));
        given(tokenRepository.findRefreshToken(1L)).willReturn(Optional.of("other-refresh-token"));

        // when & then
        assertThatThrownBy(() -> authService.reissue(refreshToken))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.REFRESH_TOKEN_INVALID);
        then(tokenRepository).should().deleteRefreshToken(1L);
        then(tokenRepository).should(never()).saveRefreshToken(Mockito.anyLong(), Mockito.anyString(), Mockito.anyLong());
    }

    @Test
    @DisplayName("저장된 Refresh Token과 일치하면 새 토큰으로 회전 저장한다")
    void reissueRotatesStoredRefreshTokenWhenTokenMatches() {
        // given
        Member member = Member.create("user@example.com", "encoded-password", "nickname", null, Gender.MALE);
        ReflectionTestUtils.setField(member, "id", 1L);
        String refreshToken = jwtProvider.createRefreshToken(1L, member.getRole().name());

        given(memberRepository.findById(1L)).willReturn(Optional.of(member));
        given(tokenRepository.findRefreshToken(1L)).willReturn(Optional.of(refreshToken));

        // when
        AuthTokens authTokens = authService.reissue(refreshToken);

        // then
        assertThat(authTokens.refreshToken()).isNotEqualTo(refreshToken);
        then(tokenRepository).should().saveRefreshToken(1L, authTokens.refreshToken(), 1_209_600_000L);
    }

    @Test
    @DisplayName("로그아웃 시 저장된 Refresh Token을 삭제하고 Access Token을 블랙리스트에 등록한다")
    void logoutDeletesStoredRefreshTokenAndBlacklistsAccessToken() {
        // given
        String accessToken = jwtProvider.createAccessToken(1L, "USER");
        String refreshToken = jwtProvider.createRefreshToken(1L, "USER");
        given(tokenRepository.findRefreshToken(1L)).willReturn(Optional.of(refreshToken));

        // when
        authService.logout(1L, accessToken, refreshToken);

        // then
        then(tokenRepository).should().deleteRefreshToken(1L);
        ArgumentCaptor<JwtClaims> claimsCaptor = ArgumentCaptor.forClass(JwtClaims.class);
        then(tokenRepository).should().blacklistAccessToken(claimsCaptor.capture());
        assertThat(claimsCaptor.getValue().memberId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("로그아웃 시 Access Token이 유효하지 않으면 블랙리스트 등록을 건너뛴다")
    void logoutSkipsBlacklistingWhenAccessTokenIsInvalid() {
        // when
        String refreshToken = jwtProvider.createRefreshToken(1L, "USER");
        given(tokenRepository.findRefreshToken(1L)).willReturn(Optional.of(refreshToken));

        authService.logout(1L, "invalid-token", refreshToken);

        // then
        then(tokenRepository).should().deleteRefreshToken(1L);
        then(tokenRepository).should(never()).blacklistAccessToken(Mockito.any());
    }

    @Test
    @DisplayName("로그아웃 요청의 리프레시 토큰이 저장된 값과 다르면 저장된 토큰을 삭제하고 거절한다")
    void logoutDeletesStoredRefreshTokenAndRejectsOnRefreshTokenMismatch() {
        // given
        String refreshToken = jwtProvider.createRefreshToken(1L, "USER");
        given(tokenRepository.findRefreshToken(1L)).willReturn(Optional.of("other-refresh-token"));

        // when & then
        assertThatThrownBy(() -> authService.logout(1L, "invalid-access-token", refreshToken))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.REFRESH_TOKEN_INVALID);
        then(tokenRepository).should().deleteRefreshToken(1L);
        then(tokenRepository).should(never()).blacklistAccessToken(Mockito.any());
    }
}
