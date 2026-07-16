package com.wecandoit.backend.common.security;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.Name;

@ConfigurationProperties(prefix = "cors")
public record CorsProperties(
        @Name("allowed-origins")
        List<String> allowedOrigins
) {
}
