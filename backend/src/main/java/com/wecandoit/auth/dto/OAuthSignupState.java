package com.wecandoit.auth.dto;

import com.wecandoit.member.domain.AuthProvider;

public record OAuthSignupState(
        String email,
        AuthProvider provider,
        String nickname
) {
}
