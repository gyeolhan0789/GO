package com.wecandoit.auth.dto;

public record OAuthVerifyResponse(
        OAuthLoginStatus status,
        String accessToken,
        String refreshToken,
        String signupToken
) {

    public static OAuthVerifyResponse login(AuthTokens tokens) {
        return new OAuthVerifyResponse(OAuthLoginStatus.LOGIN, tokens.accessToken(), tokens.refreshToken(), null);
    }

    public static OAuthVerifyResponse signupRequired(String signupToken) {
        return new OAuthVerifyResponse(OAuthLoginStatus.SIGNUP_REQUIRED, null, null, signupToken);
    }
}
