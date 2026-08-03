package com.wecandoit.common.security;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.jwt.JwtClaims;
import com.wecandoit.common.jwt.JwtProvider;
import com.wecandoit.common.jwt.TokenRepository;
import com.wecandoit.common.jwt.TokenValidationResult;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JwtAuthenticator {

    private static final String ROLE_PREFIX = "ROLE_";

    private final JwtProvider jwtProvider;
    private final TokenRepository tokenRepository;

    public Authentication authenticateAccessToken(String accessToken) {
        if (accessToken == null) {
            throw new CustomException(ErrorCode.UNAUTHENTICATED);
        }

        TokenValidationResult validationResult = jwtProvider.validateAccessToken(accessToken);
        if (validationResult instanceof TokenValidationResult.Invalid invalid) {
            throw tokenException(invalid);
        }

        JwtClaims claims = ((TokenValidationResult.Valid) validationResult).claims();
        if (tokenRepository.isBlacklisted(claims.jwtId())) {
            throw new CustomException(ErrorCode.TOKEN_INVALID);
        }

        return UsernamePasswordAuthenticationToken.authenticated(
                claims.memberId(),
                null,
                List.of(new SimpleGrantedAuthority(ROLE_PREFIX + claims.role()))
        );
    }

    private CustomException tokenException(TokenValidationResult.Invalid invalid) {
        ErrorCode errorCode = invalid.reason() == TokenValidationResult.InvalidReason.EXPIRED
                ? ErrorCode.TOKEN_EXPIRED
                : ErrorCode.TOKEN_INVALID;
        return new CustomException(errorCode);
    }
}
