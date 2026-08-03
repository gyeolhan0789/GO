package com.wecandoit.point.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.point.controller.response.PointHistoryResponse;
import com.wecandoit.point.domain.PointHistory;
import com.wecandoit.point.domain.PointHistoryType;
import com.wecandoit.point.repository.PointHistoryRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("포인트 이력 조회 서비스")
class PointHistoryReadServiceTest {

    @Mock
    private PointHistoryRepository pointHistoryRepository;

    @InjectMocks
    private PointHistoryReadService pointHistoryReadService;

    @Test
    @DisplayName("회원의 포인트 이력을 저장소 조회 순서대로 응답으로 반환한다")
    void returnsOnlyTheRequestedMembersHistoriesInRepositoryOrder() {
        // given
        PointHistory reward = PointHistory.gameGoalReward(1L, 100L, 10L, 200L);
        PointHistory bingoCellReward = PointHistory.bingoCellReward(1L, 1000L, 10L, 30L);
        PointHistory stepGoalReward = PointHistory.dailyStepGoalReward(1L, 2000L, 10L, 100L);
        PointHistory purchase = PointHistory.itemPurchase(1L, 20L, "Red Hat", 1_000L);
        setIdAndCreatedAt(reward, 4L, LocalDateTime.of(2026, 7, 24, 12, 0));
        setIdAndCreatedAt(bingoCellReward, 3L, LocalDateTime.of(2026, 7, 24, 11, 30));
        setIdAndCreatedAt(stepGoalReward, 2L, LocalDateTime.of(2026, 7, 24, 11, 15));
        setIdAndCreatedAt(purchase, 1L, LocalDateTime.of(2026, 7, 24, 11, 0));
        given(pointHistoryRepository.findAllByMemberIdOrderByCreatedAtDescIdDesc(1L))
                .willReturn(List.of(reward, bingoCellReward, stepGoalReward, purchase));

        // when
        List<PointHistoryResponse> responses = pointHistoryReadService.getPointHistories(1L);

        // then
        assertThat(responses).containsExactly(
                new PointHistoryResponse(4L, PointHistoryType.GAME_GOAL_REWARD, 200L,
                        reward.getCreatedAt(), 10L, 100L, null, null, null, null),
                new PointHistoryResponse(3L, PointHistoryType.BINGO_CELL_REWARD, 30L,
                        bingoCellReward.getCreatedAt(), 10L, null, 1000L, null, null, null),
                new PointHistoryResponse(2L, PointHistoryType.DAILY_STEP_GOAL_REWARD, 100L,
                        stepGoalReward.getCreatedAt(), 10L, null, null, 2000L, null, null),
                new PointHistoryResponse(1L, PointHistoryType.ITEM_PURCHASE, -1_000L,
                        purchase.getCreatedAt(), null, null, null, null, 20L, "Red Hat")
        );
        then(pointHistoryRepository).should().findAllByMemberIdOrderByCreatedAtDescIdDesc(1L);
    }

    private void setIdAndCreatedAt(PointHistory pointHistory, Long id, LocalDateTime createdAt) {
        ReflectionTestUtils.setField(pointHistory, "id", id);
        ReflectionTestUtils.setField(pointHistory, "createdAt", createdAt);
    }
}
