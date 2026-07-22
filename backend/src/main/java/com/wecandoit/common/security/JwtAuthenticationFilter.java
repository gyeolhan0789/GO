package com.wecandoit.common.security;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.jwt.JwtClaims;
import com.wecandoit.common.jwt.JwtProvider;
import com.wecandoit.common.jwt.TokenRepository;
import com.wecandoit.common.jwt.TokenValidationResult;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.PathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final Set<String> PERMIT_ALL_PATHS = Set.of(
            "/auth/signup",
            "/auth/login",
            "/auth/reissue",
            "/auth/oauth/google",
            "/auth/oauth/kakao",
            "/swagger-ui.html",
            "/swagger-ui/**",
            "/v3/api-docs",
            "/v3/api-docs/**"
    );

    private static final String ROLE_PREFIX = "ROLE_";
    private static final PathMatcher PATH_MATCHER = new AntPathMatcher();

    private final JwtProvider jwtProvider;
    private final TokenRepository tokenRepository;
    private final HandlerExceptionResolver handlerExceptionResolver;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return PERMIT_ALL_PATHS.stream()
                .anyMatch(permitAllPath -> PATH_MATCHER.match(permitAllPath, path));
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String accessToken = BearerTokenExtractor.extract(request);

        if (accessToken == null) {
            filterChain.doFilter(request, response);
            return;
        }

        TokenValidationResult validationResult = jwtProvider.validateAccessToken(accessToken);
        if (validationResult instanceof TokenValidationResult.Invalid invalid) {
            resolveTokenException(request, response, invalid);
            return;
        }

        JwtClaims claims = ((TokenValidationResult.Valid) validationResult).claims();
        if (tokenRepository.isBlacklisted(claims.jwtId())) {
            SecurityContextHolder.clearContext();
            handlerExceptionResolver.resolveException(
                    request, response, null, new CustomException(ErrorCode.TOKEN_INVALID));
            return;
        }

        UsernamePasswordAuthenticationToken authentication = UsernamePasswordAuthenticationToken.authenticated(
                claims.memberId(),
                null,
                List.of(new SimpleGrantedAuthority(ROLE_PREFIX + claims.role()))
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        filterChain.doFilter(request, response);
    }

    private void resolveTokenException(
            HttpServletRequest request,
            HttpServletResponse response,
            TokenValidationResult.Invalid invalid
    ) {
        ErrorCode errorCode = invalid.reason() == TokenValidationResult.InvalidReason.EXPIRED
                ? ErrorCode.TOKEN_EXPIRED
                : ErrorCode.TOKEN_INVALID;
        SecurityContextHolder.clearContext();
        handlerExceptionResolver.resolveException(request, response, null, new CustomException(errorCode));
    }
}
