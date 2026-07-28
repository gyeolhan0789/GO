package com.wecandoit.auth.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.jwt.JwtClaims;
import com.wecandoit.common.jwt.JwtProvider;
import com.wecandoit.common.jwt.TokenRepository;
import com.wecandoit.common.jwt.TokenValidationResult;
import com.wecandoit.auth.dto.AuthTokens;
import com.wecandoit.auth.dto.LoginRequest;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final JwtProvider jwtProvider;
    private final TokenRepository tokenRepository;
    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenIssuer tokenIssuer;

    public AuthTokens login(LoginRequest request) {
        Member member = memberRepository.findByEmail(request.email())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.password(), member.getPassword())) {
            throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
        }

        return tokenIssuer.issue(member.getId(), member.getRole().name());
    }

    public AuthTokens reissue(String refreshToken) {
        TokenValidationResult validationResult = jwtProvider.validateRefreshToken(refreshToken);
        if (validationResult instanceof TokenValidationResult.Invalid) {
            throw new CustomException(ErrorCode.REFRESH_TOKEN_INVALID);
        }

        JwtClaims claims = ((TokenValidationResult.Valid) validationResult).claims();
        Member member = memberRepository.findById(claims.memberId())
                .orElseThrow(() -> new CustomException(ErrorCode.REFRESH_TOKEN_INVALID));
        String storedRefreshToken = tokenRepository.findRefreshToken(member.getId())
                .orElseThrow(() -> new CustomException(ErrorCode.REFRESH_TOKEN_INVALID));

        if (!storedRefreshToken.equals(refreshToken)) {
            tokenRepository.deleteRefreshToken(member.getId());
            throw new CustomException(ErrorCode.REFRESH_TOKEN_INVALID);
        }

        return tokenIssuer.issue(member.getId(), member.getRole().name());
    }

    public void logout(Long memberId, String accessToken, String refreshToken) {
        TokenValidationResult validationResult = jwtProvider.validateRefreshToken(refreshToken);
        if (validationResult instanceof TokenValidationResult.Invalid) {
            throw new CustomException(ErrorCode.REFRESH_TOKEN_INVALID);
        }

        JwtClaims refreshTokenClaims = ((TokenValidationResult.Valid) validationResult).claims();
        if (!memberId.equals(refreshTokenClaims.memberId())) {
            throw new CustomException(ErrorCode.REFRESH_TOKEN_INVALID);
        }

        String storedRefreshToken = tokenRepository.findRefreshToken(memberId).orElse(null);
        if (storedRefreshToken != null && !storedRefreshToken.equals(refreshToken)) {
            tokenRepository.deleteRefreshToken(memberId);
            throw new CustomException(ErrorCode.REFRESH_TOKEN_INVALID);
        }

        tokenRepository.deleteRefreshToken(memberId);
        if (jwtProvider.validateAccessToken(accessToken) instanceof TokenValidationResult.Valid valid) {
            tokenRepository.blacklistAccessToken(valid.claims());
        }
    }

}
