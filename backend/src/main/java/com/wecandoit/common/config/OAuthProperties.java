package com.wecandoit.common.config;

import com.wecandoit.member.domain.AuthProvider;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "oauth")
public record OAuthProperties(
        Map<String, ProviderProperties> providers
) {

    public record ProviderProperties(
            String clientId,
            String jwkUri
    ) {
    }

    public ProviderProperties getProvider(AuthProvider provider) {
        return providers.get(provider.name().toLowerCase());
    }
}
