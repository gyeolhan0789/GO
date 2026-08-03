package com.wecandoit.point.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.mission.domain.MissionDifficulty;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("포인트 보상 정책")
class PointRewardPolicyTest {

    @Test
    @DisplayName("게임 목표와 하루 목표 걸음 보상 포인트를 반환한다")
    void returnsGoalRewardPoints() {
        assertThat(PointRewardPolicy.GAME_GOAL.getPoint()).isEqualTo(200L);
        assertThat(PointRewardPolicy.BATTLE_WINNER_GAME_GOAL.getPoint()).isEqualTo(300L);
        assertThat(PointRewardPolicy.BATTLE_LOSER_GAME_GOAL.getPoint()).isEqualTo(50L);
        assertThat(PointRewardPolicy.DAILY_STEP_GOAL.getPoint()).isEqualTo(100L);
    }

    @Test
    @DisplayName("미션 난이도별 빙고 칸 완료 보상 포인트를 반환한다")
    void returnsBingoCellRewardPointByMissionDifficulty() {
        assertThat(PointRewardPolicy.getBingoCellRewardPoint(MissionDifficulty.LOW)).isEqualTo(30L);
        assertThat(PointRewardPolicy.getBingoCellRewardPoint(MissionDifficulty.MEDIUM)).isEqualTo(50L);
        assertThat(PointRewardPolicy.getBingoCellRewardPoint(MissionDifficulty.HIGH)).isEqualTo(70L);
    }
}
