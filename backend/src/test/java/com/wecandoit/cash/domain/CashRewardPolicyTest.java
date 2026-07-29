package com.wecandoit.cash.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.mission.domain.MissionType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("캐시 보상 정책")
class CashRewardPolicyTest {

    @Test
    @DisplayName("게임 목표와 하루 목표 걸음 보상 포인트를 반환한다")
    void returnsGoalRewardPoints() {
        assertThat(CashRewardPolicy.GAME_GOAL.getPoint()).isEqualTo(200L);
        assertThat(CashRewardPolicy.DAILY_STEP_GOAL.getPoint()).isEqualTo(100L);
    }

    @Test
    @DisplayName("미션 타입별 빙고 칸 완료 보상 포인트를 반환한다")
    void returnsBingoCellRewardPointByMissionType() {
        assertThat(CashRewardPolicy.getBingoCellRewardPoint(MissionType.OBJECT)).isEqualTo(30L);
        assertThat(CashRewardPolicy.getBingoCellRewardPoint(MissionType.ATTRIBUTE)).isEqualTo(50L);
        assertThat(CashRewardPolicy.getBingoCellRewardPoint(MissionType.RELATION)).isEqualTo(70L);
    }
}
