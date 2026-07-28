package com.wecandoit.auth.controller;

import com.wecandoit.auth.dto.AuthTokens;
import com.wecandoit.auth.dto.OAuthTokenRequest;
import com.wecandoit.auth.service.OAuthService;
import com.wecandoit.member.domain.AuthProvider;
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

    @PostMapping("/google")
    public ResponseEntity<AuthTokens> googleLogin(@Valid @RequestBody OAuthTokenRequest request) {
        return ResponseEntity.ok(oAuthService.oauthLogin(AuthProvider.GOOGLE, request.idToken(), request.gender()));
    }

    @PostMapping("/kakao")
    public ResponseEntity<AuthTokens> kakaoLogin(@Valid @RequestBody OAuthTokenRequest request) {
        return ResponseEntity.ok(oAuthService.oauthLogin(AuthProvider.KAKAO, request.idToken(), request.gender()));
    }
}
