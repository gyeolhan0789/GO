package com.wecandoit.backend.domain.auth;

import com.wecandoit.backend.common.jwt.RefreshTokenCookieManager;
import com.wecandoit.backend.common.security.BearerTokenExtractor;
import com.wecandoit.backend.common.security.LoginMemberId;
import com.wecandoit.backend.domain.auth.dto.AccessTokenResponse;
import com.wecandoit.backend.domain.auth.dto.AuthTokens;
import com.wecandoit.backend.domain.auth.dto.LoginRequest;
import com.wecandoit.backend.domain.member.MemberService;
import com.wecandoit.backend.domain.member.dto.SignupRequest;
import com.wecandoit.backend.domain.member.dto.SignupResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
    private final MemberService memberService;
    private final RefreshTokenCookieManager refreshTokenCookieManager;

    @PostMapping("/signup")
    public ResponseEntity<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        SignupResponse response = memberService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AccessTokenResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response
    ) {
        AuthTokens authTokens = authService.login(request);
        refreshTokenCookieManager.setCookie(response, authTokens.refreshToken());
        return ResponseEntity.ok(new AccessTokenResponse(authTokens.accessToken()));
    }

    @PostMapping("/reissue")
    public ResponseEntity<AccessTokenResponse> reissue(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        AuthTokens authTokens = authService.reissue(refreshTokenCookieManager.getRefreshToken(request));
        refreshTokenCookieManager.setCookie(response, authTokens.refreshToken());
        return ResponseEntity.ok(new AccessTokenResponse(authTokens.accessToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @LoginMemberId Long memberId,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        authService.logout(memberId, BearerTokenExtractor.extract(request));
        refreshTokenCookieManager.deleteCookie(response);
        return ResponseEntity.noContent().build();
    }
}
