package com.wecandoit.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.common.testcontainers.RedisTestContainer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.context.ImportTestcontainers;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@ImportTestcontainers(RedisTestContainer.class)
class ManagementSecurityConfigTest {

    @Autowired
    private FilterChainProxy filterChainProxy;

    @Test
    @DisplayName("management 포트로 들어온 요청은 첫 번째(management) 체인과 매칭된다")
    void managementPortMatchesFirstChain() {
        // given
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setLocalPort(9091);

        // when & then
        assertThat(filterChainProxy.getFilterChains().get(0).matches(request)).isTrue();
    }

    @Test
    @DisplayName("애플리케이션 포트로 들어온 요청은 management 체인과 매칭되지 않는다")
    void applicationPortDoesNotMatchManagementChain() {
        // given
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setLocalPort(8080);

        // when & then
        assertThat(filterChainProxy.getFilterChains().get(0).matches(request)).isFalse();
    }
}
