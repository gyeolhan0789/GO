package com.wecandoit.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.jwt.JwtProperties;
import com.wecandoit.common.jwt.JwtProvider;
import com.wecandoit.common.jwt.TokenRepository;
import com.wecandoit.auth.dto.AuthTokens;
import com.wecandoit.auth.dto.OAuthUserInfo;
import com.wecandoit.member.domain.AuthProvider;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("OAuth 서비스")
class OAuthServiceTest {

    private final JwtProperties jwtProperties = new JwtProperties(
            "test-only-jwt-secret-key-please-change-me-1234567890",
            1_800_000L,
            1_209_600_000L
    );
    private final JwtProvider jwtProvider = new JwtProvider(jwtProperties);
    private final OAuthApiClient oAuthApiClient = Mockito.mock(OAuthApiClient.class);
    private final MemberRepository memberRepository = Mockito.mock(MemberRepository.class);
    private final TokenRepository tokenRepository = Mockito.mock(TokenRepository.class);
    private final TokenIssuer tokenIssuer = new TokenIssuer(jwtProvider, tokenRepository, jwtProperties);
    private final OAuthService oAuthService = new OAuthService(
            oAuthApiClient,
            memberRepository,
            tokenIssuer
    );

    @Test
    @DisplayName("신규 소셜 사용자는 Member를 생성하고 토큰을 발급한다")
    void oauthLoginCreatesMemberAndIssuesTokensForNewUser() {
        when(oAuthApiClient.verifyAndExtract(AuthProvider.GOOGLE, "valid-id-token"))
                .thenReturn(new OAuthUserInfo("new@gmail.com", "신규유저"));
        when(memberRepository.findByEmail("new@gmail.com")).thenReturn(Optional.empty());

        Member savedMember = Member.createSocial("new@gmail.com", "신규유저", AuthProvider.GOOGLE);
        ReflectionTestUtils.setField(savedMember, "id", 1L);
        when(memberRepository.save(any(Member.class))).thenReturn(savedMember);

        AuthTokens tokens = oAuthService.oauthLogin(AuthProvider.GOOGLE, "valid-id-token");

        assertThat(tokens.accessToken()).isNotBlank();
        assertThat(tokens.refreshToken()).isNotBlank();
        verify(memberRepository).save(any(Member.class));
        verify(tokenRepository).saveRefreshToken(eq(1L), eq(tokens.refreshToken()), anyLong());
    }

    @Test
    @DisplayName("기존 소셜 사용자는 Member를 새로 생성하지 않고 토큰을 발급한다")
    void oauthLoginIssuesTokensForExistingUserWithoutCreatingMember() {
        Member existingMember = Member.createSocial("existing@gmail.com", "기존유저", AuthProvider.GOOGLE);
        ReflectionTestUtils.setField(existingMember, "id", 2L);

        when(oAuthApiClient.verifyAndExtract(AuthProvider.GOOGLE, "valid-id-token"))
                .thenReturn(new OAuthUserInfo("existing@gmail.com", "기존유저"));
        when(memberRepository.findByEmail("existing@gmail.com")).thenReturn(Optional.of(existingMember));

        AuthTokens tokens = oAuthService.oauthLogin(AuthProvider.GOOGLE, "valid-id-token");

        assertThat(tokens.accessToken()).isNotBlank();
        verify(memberRepository, never()).save(any(Member.class));
        verify(tokenRepository).saveRefreshToken(eq(2L), eq(tokens.refreshToken()), anyLong());
    }

    @Test
    @DisplayName("동일 이메일이 다른 provider로 가입되어 있으면 OAUTH_PROVIDER_MISMATCH 오류를 반환한다")
    void oauthLoginRejectsProviderMismatchForSameEmail() {
        Member localMember = Member.create("user@gmail.com", "encoded-password", "로컬유저");
        ReflectionTestUtils.setField(localMember, "id", 3L);

        when(oAuthApiClient.verifyAndExtract(AuthProvider.GOOGLE, "valid-id-token"))
                .thenReturn(new OAuthUserInfo("user@gmail.com", "구글유저"));
        when(memberRepository.findByEmail("user@gmail.com")).thenReturn(Optional.of(localMember));

        assertThatThrownBy(() -> oAuthService.oauthLogin(AuthProvider.GOOGLE, "valid-id-token"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.OAUTH_PROVIDER_MISMATCH);
        verify(memberRepository, never()).save(any(Member.class));
        verify(tokenRepository, never()).saveRefreshToken(anyLong(), any(), anyLong());
    }

    @Test
    @DisplayName("idToken 검증 실패 시 OAuthApiClient의 오류가 그대로 전파된다")
    void oauthLoginPropagatesTokenInvalidErrorFromApiClient() {
        when(oAuthApiClient.verifyAndExtract(AuthProvider.KAKAO, "invalid-id-token"))
                .thenThrow(new CustomException(ErrorCode.OAUTH_TOKEN_INVALID));

        assertThatThrownBy(() -> oAuthService.oauthLogin(AuthProvider.KAKAO, "invalid-id-token"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.OAUTH_TOKEN_INVALID);
        verify(memberRepository, never()).findByEmail(any());
        verify(memberRepository, never()).save(any());
    }

    @Test
    @DisplayName("소셜 로그인 성공 시 Refresh Token을 회원 기준으로 저장한다")
    void oauthLoginStoresRefreshTokenForMember() {
        Member member = Member.createSocial("kakao@kakao.com", "카카오유저", AuthProvider.KAKAO);
        ReflectionTestUtils.setField(member, "id", 4L);

        when(oAuthApiClient.verifyAndExtract(AuthProvider.KAKAO, "valid-kakao-token"))
                .thenReturn(new OAuthUserInfo("kakao@kakao.com", "카카오유저"));
        when(memberRepository.findByEmail("kakao@kakao.com")).thenReturn(Optional.of(member));

        AuthTokens tokens = oAuthService.oauthLogin(AuthProvider.KAKAO, "valid-kakao-token");

        verify(tokenRepository).saveRefreshToken(4L, tokens.refreshToken(), 1_209_600_000L);
    }
}
