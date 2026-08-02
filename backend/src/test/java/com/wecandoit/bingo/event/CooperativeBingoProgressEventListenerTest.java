package com.wecandoit.bingo.event;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;

import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
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

@SpringJUnitConfig(CooperativeBingoProgressEventListenerTest.TestConfig.class)
@DisplayName("협동 빙고 진행 이벤트 리스너")
class CooperativeBingoProgressEventListenerTest {

    private static final CooperativeBingoProgressUpdatedEvent EVENT =
            new CooperativeBingoProgressUpdatedEvent(
                    10L,
                    100L,
                    1000L,
                    BingoCellVerificationStatus.APPROVED,
                    1L,
                    null,
                    3,
                    1
            );

    @Autowired
    private ApplicationEventPublisher eventPublisher;
    @Autowired
    private PlatformTransactionManager transactionManager;
    @MockitoBean
    private SimpMessagingTemplate messagingTemplate;

    @Test
    @DisplayName("트랜잭션이 커밋되면 같은 방의 빙고 진행 Topic으로 이벤트를 전송한다")
    void sendsEventToRoomTopicAfterCommit() {
        // given
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);

        // when
        transactionTemplate.executeWithoutResult(status -> {
            eventPublisher.publishEvent(EVENT);
            then(messagingTemplate).shouldHaveNoInteractions();
        });

        // then
        then(messagingTemplate).should().convertAndSend("/topic/rooms/10/bingo-progress", EVENT);
    }

    @Test
    @DisplayName("트랜잭션이 롤백되면 빙고 진행 이벤트를 전송하지 않는다")
    void doesNotSendEventAfterRollback() {
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
    @DisplayName("메시지 전송 실패는 커밋된 비즈니스 결과에 전파하지 않는다")
    void doesNotPropagateMessagingFailure() {
        // given
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        willThrow(new RuntimeException("메시지 브로커 전송 실패"))
                .given(messagingTemplate)
                .convertAndSend("/topic/rooms/10/bingo-progress", EVENT);

        // when & then
        assertThatCode(() -> transactionTemplate.executeWithoutResult(status -> eventPublisher.publishEvent(EVENT)))
                .doesNotThrowAnyException();
    }

    @Configuration
    @EnableTransactionManagement
    @Import(CooperativeBingoProgressEventListener.class)
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
