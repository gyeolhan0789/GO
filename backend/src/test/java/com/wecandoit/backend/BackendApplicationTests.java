package com.wecandoit.backend;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.backend.common.jwt.JwtProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class BackendApplicationTests {

	@Autowired
	private JwtProperties jwtProperties;

	@Test
	void contextLoads() {
	}

	@Test
	void jwtPropertiesBindExistingYamlKeys() {
		assertThat(jwtProperties.secret()).isEqualTo("test-only-jwt-secret-key-please-change-me-1234567890");
		assertThat(jwtProperties.accessTokenExpirationMillis()).isEqualTo(1_800_000L);
		assertThat(jwtProperties.refreshTokenExpirationMillis()).isEqualTo(1_209_600_000L);
	}

}
