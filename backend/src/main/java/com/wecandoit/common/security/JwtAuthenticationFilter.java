package com.wecandoit.common.security;

import com.wecandoit.common.exception.CustomException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
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
            "/auth/oauth/**",
            "/swagger-ui.html",
            "/swagger-ui/**",
            "/v3/api-docs",
            "/v3/api-docs/**",
            "/actuator/health",
            "/actuator/health/**",
            "/uploads/**",
            "/ws"
    );

    private static final PathMatcher PATH_MATCHER = new AntPathMatcher();

    private final JwtAuthenticator jwtAuthenticator;
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

        Authentication authentication;
        try {
            authentication = jwtAuthenticator.authenticateAccessToken(accessToken);
        } catch (CustomException exception) {
            SecurityContextHolder.clearContext();
            handlerExceptionResolver.resolveException(request, response, null, exception);
            return;
        }
        SecurityContextHolder.getContext().setAuthentication(authentication);
        filterChain.doFilter(request, response);
    }
}
