package com.wecandoit.common.logging;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "observability.query")
public record QueryLoggingProperties(
        boolean enabled
) {
}
