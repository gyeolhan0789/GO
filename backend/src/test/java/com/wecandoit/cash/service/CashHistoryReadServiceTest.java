package com.wecandoit.cash.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.cash.controller.response.CashHistoryResponse;
import com.wecandoit.cash.domain.CashHistory;
import com.wecandoit.cash.domain.CashHistoryType;
import com.wecandoit.cash.repository.CashHistoryRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class CashHistoryReadServiceTest {

    @Mock
    private CashHistoryRepository cashHistoryRepository;

    @InjectMocks
    private CashHistoryReadService cashHistoryReadService;

    @Test
    void returnsOnlyTheRequestedMembersHistoriesInRepositoryOrder() {
        CashHistory reward = CashHistory.bingoReward(1L, 10L, 500L);
        CashHistory purchase = CashHistory.itemPurchase(1L, 20L, "Red Hat", 1_000L);
        setIdAndCreatedAt(reward, 2L, LocalDateTime.of(2026, 7, 24, 12, 0));
        setIdAndCreatedAt(purchase, 1L, LocalDateTime.of(2026, 7, 24, 11, 0));
        given(cashHistoryRepository.findAllByMemberIdOrderByCreatedAtDescIdDesc(1L))
                .willReturn(List.of(reward, purchase));

        List<CashHistoryResponse> responses = cashHistoryReadService.getCashHistories(1L);

        assertThat(responses).containsExactly(
                new CashHistoryResponse(2L, CashHistoryType.BINGO_REWARD, 500L,
                        reward.getCreatedAt(), 10L, null, null),
                new CashHistoryResponse(1L, CashHistoryType.ITEM_PURCHASE, -1_000L,
                        purchase.getCreatedAt(), null, 20L, "Red Hat")
        );
        then(cashHistoryRepository).should().findAllByMemberIdOrderByCreatedAtDescIdDesc(1L);
    }

    private void setIdAndCreatedAt(CashHistory cashHistory, Long id, LocalDateTime createdAt) {
        ReflectionTestUtils.setField(cashHistory, "id", id);
        ReflectionTestUtils.setField(cashHistory, "createdAt", createdAt);
    }
}
