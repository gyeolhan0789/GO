package com.wecandoit.auth.controller;

import com.wecandoit.common.jwt.RefreshTokenCookieManager;
import com.wecandoit.auth.dto.AccessTokenResponse;
import com.wecandoit.auth.dto.AuthTokens;
import com.wecandoit.auth.dto.OAuthTokenRequest;
import com.wecandoit.auth.service.OAuthService;
import com.wecandoit.member.domain.AuthProvider;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth/oauth")
@RequiredArgsConstructor
public class OAuthController {

    private final OAuthService oAuthService;
    private final RefreshTokenCookieManager refreshTokenCookieManager;

    @PostMapping("/google")
    public ResponseEntity<AccessTokenResponse> googleLogin(
            @Valid @RequestBody OAuthTokenRequest request,
            HttpServletResponse response
    ) {
        AuthTokens tokens = oAuthService.oauthLogin(AuthProvider.GOOGLE, request.idToken(), request.gender());
        refreshTokenCookieManager.setCookie(response, tokens.refreshToken());
        return ResponseEntity.ok(new AccessTokenResponse(tokens.accessToken()));
    }

    @PostMapping("/kakao")
    public ResponseEntity<AccessTokenResponse> kakaoLogin(
            @Valid @RequestBody OAuthTokenRequest request,
            HttpServletResponse response
    ) {
        AuthTokens tokens = oAuthService.oauthLogin(AuthProvider.KAKAO, request.idToken(), request.gender());
        refreshTokenCookieManager.setCookie(response, tokens.refreshToken());
        return ResponseEntity.ok(new AccessTokenResponse(tokens.accessToken()));
    }
}
