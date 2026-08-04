package com.wecandoit.common.testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

@DisplayName("Persistence 테스트 데이터베이스")
@MySqlDataJpaTest
class MySqlDataJpaTestDatabaseTest {

    @Autowired
    private DataSource dataSource;

    @Test
    @DisplayName("H2가 아니라 MySQL 컨테이너에 접속한다")
    void connectsToMySqlContainer() throws SQLException {
        // when
        String productName;
        try (Connection connection = dataSource.getConnection()) {
            productName = connection.getMetaData().getDatabaseProductName();
        }

        // then
        assertThat(productName).isEqualTo("MySQL");
    }
}
