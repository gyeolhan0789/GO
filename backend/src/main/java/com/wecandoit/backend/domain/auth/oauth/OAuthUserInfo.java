package com.wecandoit.backend.domain.auth.oauth;

public record OAuthUserInfo(
        String email,
        String nickname
) {
}
