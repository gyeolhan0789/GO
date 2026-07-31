package com.wecandoit.auth.controller;

import com.wecandoit.auth.dto.AuthTokens;
import com.wecandoit.auth.dto.OAuthSignupRequest;
import com.wecandoit.auth.dto.OAuthTokenRequest;
import com.wecandoit.auth.dto.OAuthVerifyResponse;
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
    public ResponseEntity<OAuthVerifyResponse> googleVerify(@Valid @RequestBody OAuthTokenRequest request) {
        return ResponseEntity.ok(oAuthService.verify(AuthProvider.GOOGLE, request.idToken()));
    }

    @PostMapping("/kakao")
    public ResponseEntity<OAuthVerifyResponse> kakaoVerify(@Valid @RequestBody OAuthTokenRequest request) {
        return ResponseEntity.ok(oAuthService.verify(AuthProvider.KAKAO, request.idToken()));
    }

    @PostMapping("/google/signup")
    public ResponseEntity<AuthTokens> googleSignup(@Valid @RequestBody OAuthSignupRequest request) {
        return ResponseEntity.ok(
                oAuthService.completeSignup(AuthProvider.GOOGLE, request.signupToken(), request.gender()));
    }

    @PostMapping("/kakao/signup")
    public ResponseEntity<AuthTokens> kakaoSignup(@Valid @RequestBody OAuthSignupRequest request) {
        return ResponseEntity.ok(
                oAuthService.completeSignup(AuthProvider.KAKAO, request.signupToken(), request.gender()));
    }
}
