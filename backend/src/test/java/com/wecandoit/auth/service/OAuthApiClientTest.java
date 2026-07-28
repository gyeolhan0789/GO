package com.wecandoit.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;

import com.wecandoit.auth.dto.OAuthUserInfo;
import com.wecandoit.common.config.OAuthProperties;
import com.wecandoit.common.config.OAuthProperties.ProviderProperties;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.member.domain.AuthProvider;
import io.jsonwebtoken.Jwts;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Date;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@DisplayName("OAuth API 클라이언트")
@ExtendWith(MockitoExtension.class)
class OAuthApiClientTest {

    private static KeyPair keyPair;
    private static final String JWK_URI = "https://test-jwk-uri";
    private static final String CLIENT_ID = "test-client-id";
    private static final String KID = "test-kid";

    @BeforeAll
    static void setUpKeyPair() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
        kpg.initialize(2048);
        keyPair = kpg.generateKeyPair();
    }

    @Mock
    private JwkProvider jwkProvider;
    @Mock
    private OAuthProperties oAuthProperties;
    private OAuthApiClient oAuthApiClient;

    @BeforeEach
    void setUp() {
        oAuthApiClient = new OAuthApiClient(oAuthProperties, jwkProvider);
    }

    private String buildIdToken(String clientId, String email, String nameClaimKey, String nameValue, long expirationMillis) {
        return Jwts.builder()
                .header().add("kid", KID).and()
                .issuer("https://accounts.google.com")
                .subject("test-subject")
                .claim("aud", clientId)
                .claim("email", email)
                .claim(nameClaimKey, nameValue)
                .expiration(new Date(System.currentTimeMillis() + expirationMillis))
                .signWith(keyPair.getPrivate())
                .compact();
    }

    @Test
    @DisplayName("유효한 Google idToken에서 이메일과 이름을 추출한다")
    void extractsEmailAndNameFromValidGoogleIdToken() {
        // given
        given(oAuthProperties.getProvider(AuthProvider.GOOGLE))
                .willReturn(new ProviderProperties(CLIENT_ID, JWK_URI));
        given(jwkProvider.getKey(JWK_URI, KID)).willReturn(keyPair.getPublic());

        String idToken = buildIdToken(CLIENT_ID, "user@gmail.com", "name", "테스트유저", 3_600_000L);

        // when
        OAuthUserInfo userInfo = oAuthApiClient.verifyAndExtract(AuthProvider.GOOGLE, idToken);

        // then
        assertThat(userInfo.email()).isEqualTo("user@gmail.com");
        assertThat(userInfo.nickname()).isEqualTo("테스트유저");
    }

    @Test
    @DisplayName("유효한 Kakao idToken에서 이메일과 닉네임을 추출한다")
    void extractsEmailAndNicknameFromValidKakaoIdToken() {
        // given
        given(oAuthProperties.getProvider(AuthProvider.KAKAO))
                .willReturn(new ProviderProperties(CLIENT_ID, JWK_URI));
        given(jwkProvider.getKey(JWK_URI, KID)).willReturn(keyPair.getPublic());

        String idToken = buildIdToken(CLIENT_ID, "user@kakao.com", "nickname", "카카오유저", 3_600_000L);

        // when
        OAuthUserInfo userInfo = oAuthApiClient.verifyAndExtract(AuthProvider.KAKAO, idToken);

        // then
        assertThat(userInfo.email()).isEqualTo("user@kakao.com");
        assertThat(userInfo.nickname()).isEqualTo("카카오유저");
    }

    @Test
    @DisplayName("aud가 clientId와 다르면 OAUTH_TOKEN_INVALID 오류를 반환한다")
    void rejectsIdTokenWithAudienceMismatch() {
        // given
        given(oAuthProperties.getProvider(AuthProvider.GOOGLE))
                .willReturn(new ProviderProperties(CLIENT_ID, JWK_URI));
        given(jwkProvider.getKey(JWK_URI, KID)).willReturn(keyPair.getPublic());

        String tokenWithWrongAud = buildIdToken("wrong-client-id", "user@gmail.com", "name", "유저", 3_600_000L);

        // when & then
        assertThatThrownBy(() -> oAuthApiClient.verifyAndExtract(AuthProvider.GOOGLE, tokenWithWrongAud))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.OAUTH_TOKEN_INVALID);
    }

    @Test
    @DisplayName("만료된 idToken은 OAUTH_TOKEN_INVALID 오류를 반환한다")
    void rejectsExpiredIdToken() {
        // given
        given(oAuthProperties.getProvider(AuthProvider.GOOGLE))
                .willReturn(new ProviderProperties(CLIENT_ID, JWK_URI));
        given(jwkProvider.getKey(JWK_URI, KID)).willReturn(keyPair.getPublic());

        String expiredToken = buildIdToken(CLIENT_ID, "user@gmail.com", "name", "유저", -1_000L);

        // when & then
        assertThatThrownBy(() -> oAuthApiClient.verifyAndExtract(AuthProvider.GOOGLE, expiredToken))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.OAUTH_TOKEN_INVALID);
    }

    @Test
    @DisplayName("email 클레임이 없으면 OAUTH_EMAIL_NOT_PROVIDED 오류를 반환한다")
    void rejectsIdTokenWithoutEmailClaim() {
        // given
        given(oAuthProperties.getProvider(AuthProvider.KAKAO))
                .willReturn(new ProviderProperties(CLIENT_ID, JWK_URI));
        given(jwkProvider.getKey(JWK_URI, KID)).willReturn(keyPair.getPublic());

        String tokenWithoutEmail = Jwts.builder()
                .header().add("kid", KID).and()
                .subject("test-subject")
                .claim("aud", CLIENT_ID)
                .claim("nickname", "유저")
                .expiration(new Date(System.currentTimeMillis() + 3_600_000L))
                .signWith(keyPair.getPrivate())
                .compact();

        // when & then
        assertThatThrownBy(() -> oAuthApiClient.verifyAndExtract(AuthProvider.KAKAO, tokenWithoutEmail))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.OAUTH_EMAIL_NOT_PROVIDED);
    }

    @Test
    @DisplayName("JwkProvider가 OAUTH_TOKEN_EXCHANGE_FAILED를 던지면 그대로 전파된다")
    void propagatesTokenExchangeFailedWhenJwkProviderFails() {
        // given
        given(oAuthProperties.getProvider(AuthProvider.GOOGLE))
                .willReturn(new ProviderProperties(CLIENT_ID, JWK_URI));
        willThrow(new CustomException(ErrorCode.OAUTH_TOKEN_EXCHANGE_FAILED))
                .given(jwkProvider).getKey(JWK_URI, KID);

        String idToken = buildIdToken(CLIENT_ID, "user@gmail.com", "name", "유저", 3_600_000L);

        // when & then
        assertThatThrownBy(() -> oAuthApiClient.verifyAndExtract(AuthProvider.GOOGLE, idToken))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.OAUTH_TOKEN_EXCHANGE_FAILED);
    }

    @Test
    @DisplayName("name과 nickname 클레임 모두 없으면 email을 nickname으로 사용한다")
    void fallsBackToEmailAsNicknameWhenNoNameClaims() {
        // given
        given(oAuthProperties.getProvider(AuthProvider.GOOGLE))
                .willReturn(new ProviderProperties(CLIENT_ID, JWK_URI));
        given(jwkProvider.getKey(JWK_URI, KID)).willReturn(keyPair.getPublic());

        String tokenWithoutName = Jwts.builder()
                .header().add("kid", KID).and()
                .subject("test-subject")
                .claim("aud", CLIENT_ID)
                .claim("email", "user@gmail.com")
                .expiration(new Date(System.currentTimeMillis() + 3_600_000L))
                .signWith(keyPair.getPrivate())
                .compact();

        // when
        OAuthUserInfo userInfo = oAuthApiClient.verifyAndExtract(AuthProvider.GOOGLE, tokenWithoutName);

        // then
        assertThat(userInfo.email()).isEqualTo("user@gmail.com");
        assertThat(userInfo.nickname()).isEqualTo("user@gmail.com");
    }
}
