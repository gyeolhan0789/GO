package com.wecandoit.common.jwt;

public sealed interface TokenValidationResult
        permits TokenValidationResult.Valid, TokenValidationResult.Invalid {

    enum InvalidReason {
        EXPIRED,
        INVALID,
        WRONG_TOKEN_TYPE
    }

    record Valid(JwtClaims claims) implements TokenValidationResult {
    }

    record Invalid(InvalidReason reason) implements TokenValidationResult {
    }
}
