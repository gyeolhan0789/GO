package com.wecandoit.point.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.common.testcontainers.MySqlDataJpaTest;
import com.wecandoit.point.domain.PointHistory;
import com.wecandoit.point.domain.PointHistoryType;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

@MySqlDataJpaTest
@DisplayName("포인트 이력 저장소")
class PointHistoryRepositoryTest {

    private static final Set<PointHistoryType> REWARD_TYPES = Set.of(
            PointHistoryType.BINGO_CELL_REWARD,
            PointHistoryType.DAILY_STEP_GOAL_REWARD,
            PointHistoryType.GAME_GOAL_REWARD
    );

    @Autowired
    private PointHistoryRepository pointHistoryRepository;
    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("회원과 방 및 세션 시간에 포함된 보상 이력만 조회한다")
    void findSessionRewardsReturnsOnlyRewardsWithinSession() {
        // given
        PointHistory missionReward = pointHistoryRepository.save(
                PointHistory.bingoCellReward(1L, 100L, 10L, 50L));
        PointHistory stepGoalReward = pointHistoryRepository.save(
                PointHistory.dailyStepGoalReward(1L, 200L, 10L, 100L));
        PointHistory gameReward = pointHistoryRepository.save(
                PointHistory.gameGoalReward(1L, 300L, 10L, 300L));
        PointHistory oldReward = pointHistoryRepository.save(
                PointHistory.bingoCellReward(1L, 101L, 10L, 30L));
        pointHistoryRepository.save(PointHistory.bingoCellReward(1L, 102L, 20L, 70L));
        pointHistoryRepository.save(PointHistory.bingoCellReward(2L, 103L, 10L, 70L));
        pointHistoryRepository.save(PointHistory.itemPurchase(1L, 400L, "모자", 100L));
        pointHistoryRepository.flush();

        entityManager.createNativeQuery("""
                        UPDATE point_histories
                        SET created_at = :createdAt
                        WHERE id = :id
                        """)
                .setParameter("createdAt", LocalDateTime.now().minusDays(1))
                .setParameter("id", oldReward.getId())
                .executeUpdate();
        entityManager.clear();

        LocalDateTime startedAt = LocalDateTime.now().minusMinutes(1);
        LocalDateTime endedAt = LocalDateTime.now().plusMinutes(1);

        // when
        List<PointHistory> rewards = pointHistoryRepository
                .findAllByMemberIdAndRoomIdAndTypeInAndCreatedAtBetween(
                        1L,
                        10L,
                        REWARD_TYPES,
                        startedAt,
                        endedAt
                );

        // then
        assertThat(rewards)
                .extracting(PointHistory::getId)
                .containsExactlyInAnyOrder(
                        missionReward.getId(),
                        stepGoalReward.getId(),
                        gameReward.getId()
                );
    }
}
