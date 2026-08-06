package com.wecandoit.game.event;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;

import javax.sql.DataSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;

@SpringJUnitConfig(BattleMatchingMessageEventListenerTest.TestConfig.class)
@DisplayName("배틀 매칭 메시지 이벤트 리스너")
class BattleMatchingMessageEventListenerTest {

    private static final BattleMatchingMessage MESSAGE = BattleMatchingMessage.battleCountdownStarted(
            10L,
            20L,
            1L,
            2L
    );
    private static final BattleMatchingMessageRequestedEvent EVENT =
            new BattleMatchingMessageRequestedEvent(2L, MESSAGE);

    @Autowired
    private ApplicationEventPublisher eventPublisher;
    @Autowired
    private PlatformTransactionManager transactionManager;
    @MockitoBean
    private SimpMessagingTemplate messagingTemplate;

    @Test
    @DisplayName("트랜잭션이 커밋되면 대상 회원의 개인 배틀 큐로 메시지를 전송한다")
    void sendsMessageToMemberQueueAfterCommit() {
        // given
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);

        // when
        transactionTemplate.executeWithoutResult(status -> {
            eventPublisher.publishEvent(EVENT);
            then(messagingTemplate).shouldHaveNoInteractions();
        });

        // then
        then(messagingTemplate).should().convertAndSendToUser("2", "/queue/battle", MESSAGE);
    }

    @Test
    @DisplayName("트랜잭션이 롤백되면 개인 배틀 큐로 메시지를 전송하지 않는다")
    void doesNotSendMessageAfterRollback() {
        // given
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);

        // when
        transactionTemplate.executeWithoutResult(status -> {
            eventPublisher.publishEvent(EVENT);
            status.setRollbackOnly();
        });

        // then
        then(messagingTemplate).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("메시지 전송 실패는 비즈니스 결과에 전파하지 않는다")
    void doesNotPropagateMessagingFailure() {
        // given
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        willThrow(new RuntimeException("message broker failure"))
                .given(messagingTemplate)
                .convertAndSendToUser("2", "/queue/battle", MESSAGE);

        // when & then
        assertThatCode(() -> transactionTemplate.executeWithoutResult(status -> eventPublisher.publishEvent(EVENT)))
                .doesNotThrowAnyException();
    }

    @Configuration
    @EnableTransactionManagement
    @Import(BattleMatchingMessageEventListener.class)
    static class TestConfig {

        @Bean
        DataSource dataSource() {
            return new EmbeddedDatabaseBuilder()
                    .setType(EmbeddedDatabaseType.H2)
                    .generateUniqueName(true)
                    .build();
        }

        @Bean
        PlatformTransactionManager transactionManager(DataSource dataSource) {
            return new DataSourceTransactionManager(dataSource);
        }
    }
}
