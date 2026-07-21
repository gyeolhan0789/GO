package com.wecandoit.common.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.Name;

@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(
        String secret,
        @Name("access-token-expiration")
        long accessTokenExpirationMillis,
        @Name("refresh-token-expiration")
        long refreshTokenExpirationMillis
) {
}
