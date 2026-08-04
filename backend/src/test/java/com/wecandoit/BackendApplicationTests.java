package com.wecandoit;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.common.jwt.JwtProperties;
import com.wecandoit.common.testcontainers.RedisTestContainer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.context.ImportTestcontainers;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@ImportTestcontainers(RedisTestContainer.class)
@DisplayName("백엔드 애플리케이션")
class BackendApplicationTests {

	private final JwtProperties jwtProperties;

	@Autowired
	BackendApplicationTests(JwtProperties jwtProperties) {
		this.jwtProperties = jwtProperties;
	}

	@Test
	@DisplayName("Spring Context를 로드한다")
	void contextLoads() {
	}

	@Test
	@DisplayName("JWT 설정 값을 yml 키로 바인딩한다")
	void jwtPropertiesBindExistingYamlKeys() {
		assertThat(jwtProperties.secret()).isEqualTo("test-only-jwt-secret-key-please-change-me-1234567890");
		assertThat(jwtProperties.accessTokenExpirationMillis()).isEqualTo(1_800_000L);
		assertThat(jwtProperties.refreshTokenExpirationMillis()).isEqualTo(1_209_600_000L);
	}

}
