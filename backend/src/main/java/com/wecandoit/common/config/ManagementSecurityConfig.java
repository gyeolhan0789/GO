package com.wecandoit.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class ManagementSecurityConfig {

    // management 포트는 자식 웹 컨텍스트에서 부모의 springSecurityFilterChain을 그대로 상속한다
    // (ServletManagementChildContextConfiguration이 ANCESTORS 검색으로 SecurityFilterChain 빈을 찾는다).
    // 이 빈에 HIGHEST_PRECEDENCE를 주면 FilterChainProxy가 management 포트 요청에는 이 체인을,
    // 나머지 포트에는 SecurityConfig.filterChain(순서 미지정)을 적용한다 — SecurityConfig는 그대로 둔다.
    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public SecurityFilterChain managementSecurityFilterChain(
            HttpSecurity http,
            @Value("${management.server.port:-1}") int managementPort
    ) throws Exception {
        // getServerPort()가 아니라 getLocalPort()를 쓴다: ForwardedHeaderFilter가 X-Forwarded-Port로
        // getServerPort()를 덮어써 spoofable하지만, getLocalPort()는 실제로 accept한 소켓 포트라
        // Docker 포트 매핑 뒤에서도 신뢰할 수 있다.
        http.securityMatcher(request -> request.getLocalPort() == managementPort)
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .csrf(csrf -> csrf.disable());
        return http.build();
    }
}
