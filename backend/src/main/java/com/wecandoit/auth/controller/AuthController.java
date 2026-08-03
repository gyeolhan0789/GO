package com.wecandoit.auth.controller;

import com.wecandoit.common.security.BearerTokenExtractor;
import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.auth.dto.AuthTokens;
import com.wecandoit.auth.dto.LoginRequest;
import com.wecandoit.auth.dto.RefreshTokenRequest;
import com.wecandoit.auth.service.AuthService;
import com.wecandoit.member.service.MemberCommandService;
import com.wecandoit.member.controller.request.SignupRequest;
import com.wecandoit.member.controller.response.SignupResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final MemberCommandService memberService;

    @PostMapping("/signup")
    public ResponseEntity<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        SignupResponse response = memberService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthTokens> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/reissue")
    public ResponseEntity<AuthTokens> reissue(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.reissue(request.refreshToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @LoginMemberId Long memberId,
            HttpServletRequest request,
            @Valid @RequestBody RefreshTokenRequest refreshTokenRequest
    ) {
        authService.logout(memberId, BearerTokenExtractor.extract(request), refreshTokenRequest.refreshToken());
        return ResponseEntity.noContent().build();
    }
}
