package com.wecandoit.common.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Component;

@Component
public class JwtProvider {

    private static final String ROLE_CLAIM = "role";
    private static final String TOKEN_TYPE_CLAIM = "tokenType";

    private final SecretKey key;
    private final long accessTokenExpirationMillis;
    private final long refreshTokenExpirationMillis;

    public JwtProvider(JwtProperties jwtProperties) {
        this.key = Keys.hmacShaKeyFor(jwtProperties.secret().getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirationMillis = jwtProperties.accessTokenExpirationMillis();
        this.refreshTokenExpirationMillis = jwtProperties.refreshTokenExpirationMillis();
    }

    public String createAccessToken(Long memberId, String role) {
        return createToken(memberId, role, TokenType.ACCESS, accessTokenExpirationMillis);
    }

    public String createRefreshToken(Long memberId, String role) {
        return createToken(memberId, role, TokenType.REFRESH, refreshTokenExpirationMillis);
    }

    private String createToken(Long memberId, String role, TokenType tokenType, long expiration) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expiration);
        return Jwts.builder()
                .subject(String.valueOf(memberId))
                .claim(ROLE_CLAIM, role)
                .claim(TOKEN_TYPE_CLAIM, tokenType.name())
                .id(UUID.randomUUID().toString())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    private JwtClaims getClaims(String token) {
        Claims claims = parseClaims(token);
        return new JwtClaims(
                Long.parseLong(claims.getSubject()),
                claims.get(ROLE_CLAIM, String.class),
                parseTokenType(claims),
                claims.getId(),
                claims.getExpiration().toInstant()
        );
    }

    public TokenValidationResult validateAccessToken(String token) {
        return validateTokenType(token, TokenType.ACCESS);
    }

    public TokenValidationResult validateRefreshToken(String token) {
        return validateTokenType(token, TokenType.REFRESH);
    }

    private TokenValidationResult validateTokenType(String token, TokenType expectedType) {
        try {
            JwtClaims claims = getClaims(token);
            if (claims.tokenType() != expectedType) {
                return new TokenValidationResult.Invalid(TokenValidationResult.InvalidReason.WRONG_TOKEN_TYPE);
            }
            return new TokenValidationResult.Valid(claims);
        } catch (ExpiredJwtException e) {
            return new TokenValidationResult.Invalid(TokenValidationResult.InvalidReason.EXPIRED);
        } catch (JwtException | IllegalArgumentException e) {
            return new TokenValidationResult.Invalid(TokenValidationResult.InvalidReason.INVALID);
        }
    }

    private TokenType parseTokenType(Claims claims) {
        String tokenType = claims.get(TOKEN_TYPE_CLAIM, String.class);
        if (tokenType == null) {
            throw new IllegalArgumentException("Token type claim is missing");
        }
        return TokenType.valueOf(tokenType);
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
