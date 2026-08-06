package com.wecandoit.common.logging;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "observability.http")
public record HttpAccessLoggingProperties(
        boolean enabled,
        int maxBodyLength
) {
}
