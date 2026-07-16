package com.wecandoit.backend.common.jwt;

import java.time.Instant;

public record JwtClaims(
        Long memberId,
        String role,
        TokenType tokenType,
        String jwtId,
        Instant expiration
) {
}
