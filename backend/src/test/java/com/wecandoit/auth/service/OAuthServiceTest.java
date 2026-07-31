package com.wecandoit.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;

import com.wecandoit.auth.dto.AuthTokens;
import com.wecandoit.auth.dto.OAuthLoginStatus;
import com.wecandoit.auth.dto.OAuthSignupState;
import com.wecandoit.auth.dto.OAuthUserInfo;
import com.wecandoit.auth.dto.OAuthVerifyResponse;
import com.wecandoit.auth.repository.OAuthSignupStateRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.jwt.JwtProperties;
import com.wecandoit.common.jwt.JwtProvider;
import com.wecandoit.common.jwt.TokenRepository;
import com.wecandoit.member.domain.AuthProvider;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("OAuth 서비스")
@ExtendWith(MockitoExtension.class)
class OAuthServiceTest {

    private final JwtProperties jwtProperties = new JwtProperties(
            "test-only-jwt-secret-key-please-change-me-1234567890",
            1_800_000L,
            1_209_600_000L
    );
    private final JwtProvider jwtProvider = new JwtProvider(jwtProperties);
    @Mock
    private OAuthApiClient oAuthApiClient;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private TokenRepository tokenRepository;
    @Mock
    private OAuthSignupStateRepository oAuthSignupStateRepository;
    private TokenIssuer tokenIssuer;
    private OAuthService oAuthService;

    @BeforeEach
    void setUp() {
        tokenIssuer = new TokenIssuer(jwtProvider, tokenRepository, jwtProperties);
        oAuthService = new OAuthService(
                oAuthApiClient,
                memberRepository,
                tokenIssuer,
                oAuthSignupStateRepository
        );
    }

    @Test
    @DisplayName("신규 소셜 사용자는 가입 토큰을 발급받고 Member는 생성되지 않는다")
    void verifyIssuesSignupTokenForNewUser() {
        // given
        given(oAuthApiClient.verifyAndExtract(AuthProvider.GOOGLE, "valid-id-token"))
                .willReturn(new OAuthUserInfo("new@gmail.com", "신규유저"));
        given(memberRepository.findByEmail("new@gmail.com")).willReturn(Optional.empty());
        given(oAuthSignupStateRepository.save("new@gmail.com", AuthProvider.GOOGLE, "신규유저"))
                .willReturn("signup-token-1");

        // when
        OAuthVerifyResponse response = oAuthService.verify(AuthProvider.GOOGLE, "valid-id-token");

        // then
        assertThat(response.status()).isEqualTo(OAuthLoginStatus.SIGNUP_REQUIRED);
        assertThat(response.signupToken()).isEqualTo("signup-token-1");
        assertThat(response.accessToken()).isNull();
        assertThat(response.refreshToken()).isNull();
        then(memberRepository).should(never()).save(any(Member.class));
    }

    @Test
    @DisplayName("기존 소셜 사용자는 로그인 상태로 토큰을 발급받는다")
    void verifyLogsInExistingUser() {
        // given
        Member existingMember = Member.createSocial("existing@gmail.com", "기존유저", AuthProvider.GOOGLE);
        ReflectionTestUtils.setField(existingMember, "id", 2L);

        given(oAuthApiClient.verifyAndExtract(AuthProvider.GOOGLE, "valid-id-token"))
                .willReturn(new OAuthUserInfo("existing@gmail.com", "기존유저"));
        given(memberRepository.findByEmail("existing@gmail.com")).willReturn(Optional.of(existingMember));

        // when
        OAuthVerifyResponse response = oAuthService.verify(AuthProvider.GOOGLE, "valid-id-token");

        // then
        assertThat(response.status()).isEqualTo(OAuthLoginStatus.LOGIN);
        assertThat(response.accessToken()).isNotBlank();
        assertThat(response.refreshToken()).isNotBlank();
        then(memberRepository).should(never()).save(any(Member.class));
        then(tokenRepository).should().saveRefreshToken(eq(2L), eq(response.refreshToken()), anyLong());
        then(oAuthSignupStateRepository).should(never()).save(any(), any(), any());
    }

    @Test
    @DisplayName("동일 이메일이 다른 provider로 가입되어 있으면 OAUTH_PROVIDER_MISMATCH 오류를 반환한다")
    void verifyRejectsProviderMismatchForSameEmail() {
        // given
        Member localMember = Member.create("user@gmail.com", "encoded-password", "로컬유저");
        ReflectionTestUtils.setField(localMember, "id", 3L);

        given(oAuthApiClient.verifyAndExtract(AuthProvider.GOOGLE, "valid-id-token"))
                .willReturn(new OAuthUserInfo("user@gmail.com", "구글유저"));
        given(memberRepository.findByEmail("user@gmail.com")).willReturn(Optional.of(localMember));

        // when & then
        assertThatThrownBy(() -> oAuthService.verify(AuthProvider.GOOGLE, "valid-id-token"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.OAUTH_PROVIDER_MISMATCH);
        then(memberRepository).should(never()).save(any(Member.class));
        then(tokenRepository).should(never()).saveRefreshToken(anyLong(), any(), anyLong());
    }

    @Test
    @DisplayName("idToken 검증 실패 시 OAuthApiClient의 오류가 그대로 전파된다")
    void verifyPropagatesTokenInvalidErrorFromApiClient() {
        // given
        willThrow(new CustomException(ErrorCode.OAUTH_TOKEN_INVALID))
                .given(oAuthApiClient).verifyAndExtract(AuthProvider.KAKAO, "invalid-id-token");

        // when & then
        assertThatThrownBy(() -> oAuthService.verify(AuthProvider.KAKAO, "invalid-id-token"))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.OAUTH_TOKEN_INVALID);
        then(memberRepository).should(never()).findByEmail(any());
        then(memberRepository).should(never()).save(any());
    }

    @Test
    @DisplayName("유효한 가입 토큰과 성별로 회원가입을 완료하고 토큰을 소모한다")
    void completeSignupCreatesMemberAndConsumesToken() {
        // given
        given(oAuthSignupStateRepository.find("signup-token-1"))
                .willReturn(Optional.of(new OAuthSignupState("new@gmail.com", AuthProvider.GOOGLE, "신규유저")));
        given(memberRepository.findByEmail("new@gmail.com")).willReturn(Optional.empty());

        Member savedMember = Member.createSocial("new@gmail.com", "신규유저", AuthProvider.GOOGLE, Gender.FEMALE);
        ReflectionTestUtils.setField(savedMember, "id", 10L);
        given(memberRepository.save(any(Member.class))).willReturn(savedMember);

        // when
        AuthTokens tokens = oAuthService.completeSignup(AuthProvider.GOOGLE, "signup-token-1", Gender.FEMALE);

        // then
        assertThat(tokens.accessToken()).isNotBlank();
        then(memberRepository).should().save(any(Member.class));
        then(oAuthSignupStateRepository).should().delete("signup-token-1");
        then(tokenRepository).should().saveRefreshToken(eq(10L), eq(tokens.refreshToken()), anyLong());
    }

    @Test
    @DisplayName("존재하지 않거나 만료된 가입 토큰이면 OAUTH_SIGNUP_TOKEN_INVALID 오류를 반환한다")
    void completeSignupRejectsMissingToken() {
        // given
        given(oAuthSignupStateRepository.find("missing-token")).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> oAuthService.completeSignup(AuthProvider.GOOGLE, "missing-token", Gender.MALE))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.OAUTH_SIGNUP_TOKEN_INVALID);
        then(memberRepository).should(never()).save(any());
        then(oAuthSignupStateRepository).should(never()).delete(any());
    }

    @Test
    @DisplayName("가입 토큰의 provider와 요청 provider가 다르면 OAUTH_SIGNUP_TOKEN_INVALID 오류를 반환한다")
    void completeSignupRejectsProviderMismatch() {
        // given
        given(oAuthSignupStateRepository.find("signup-token-1"))
                .willReturn(Optional.of(new OAuthSignupState("new@gmail.com", AuthProvider.GOOGLE, "신규유저")));

        // when & then
        assertThatThrownBy(() -> oAuthService.completeSignup(AuthProvider.KAKAO, "signup-token-1", Gender.MALE))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.OAUTH_SIGNUP_TOKEN_INVALID);
        then(memberRepository).should(never()).save(any());
        then(oAuthSignupStateRepository).should(never()).delete(any());
    }

    @Test
    @DisplayName("가입 토큰은 유효하지만 그 사이 이미 가입된 이메일이면 OAUTH_ALREADY_REGISTERED 오류를 반환한다")
    void completeSignupRejectsAlreadyRegisteredEmail() {
        // given
        given(oAuthSignupStateRepository.find("signup-token-1"))
                .willReturn(Optional.of(new OAuthSignupState("existing@gmail.com", AuthProvider.GOOGLE, "이미가입유저")));
        Member alreadyRegistered = Member.createSocial("existing@gmail.com", "이미가입유저", AuthProvider.GOOGLE);
        given(memberRepository.findByEmail("existing@gmail.com")).willReturn(Optional.of(alreadyRegistered));

        // when & then
        assertThatThrownBy(() -> oAuthService.completeSignup(AuthProvider.GOOGLE, "signup-token-1", Gender.MALE))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.OAUTH_ALREADY_REGISTERED);
        then(memberRepository).should(never()).save(any());
        then(oAuthSignupStateRepository).should(never()).delete(any());
    }
}
