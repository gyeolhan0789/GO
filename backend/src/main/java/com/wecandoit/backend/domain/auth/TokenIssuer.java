package com.wecandoit.backend.domain.auth;

import com.wecandoit.backend.common.jwt.JwtProperties;
import com.wecandoit.backend.common.jwt.JwtProvider;
import com.wecandoit.backend.common.jwt.TokenRepository;
import com.wecandoit.backend.domain.auth.dto.AuthTokens;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TokenIssuer {

    private final JwtProvider jwtProvider;
    private final TokenRepository tokenRepository;
    private final JwtProperties jwtProperties;

    public AuthTokens issue(Long memberId, String role) {
        String accessToken = jwtProvider.createAccessToken(memberId, role);
        String refreshToken = jwtProvider.createRefreshToken(memberId, role);
        tokenRepository.saveRefreshToken(memberId, refreshToken, jwtProperties.refreshTokenExpirationMillis());
        return new AuthTokens(accessToken, refreshToken);
    }
}
