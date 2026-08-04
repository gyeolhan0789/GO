package com.wecandoit.mission.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

@DisplayName("미션 타입")
class MissionTypeTest {

    private static final int PHOTO_VERIFIED_TYPE_COUNT = 4;
    private static final int ACTIVITY_TYPE_COUNT = 10;

    @ParameterizedTest
    @EnumSource(value = MissionType.class, names = {"OBJECT", "ATTRIBUTE", "RELATION", "ORDINARY"})
    @DisplayName("사진 계열 미션 타입은 사진 인증 대상이다")
    void photoTypesArePhotoVerified(MissionType missionType) {
        assertThat(missionType.isPhotoVerified()).isTrue();
    }

    @ParameterizedTest
    @EnumSource(value = MissionType.class, names = {
            "STEP_TOTAL",
            "STEP_CONTINUOUS",
            "STEP_UPHILL",
            "STEP_DAILY",
            "WALKING_TIME_TOTAL",
            "WALKING_TIME_CONTINUOUS",
            "STEADY_PACE",
            "DISTANCE_TOTAL",
            "CALORIES_TOTAL",
            "AVERAGE_SPEED"
    })
    @DisplayName("활동 계열 미션 타입은 사진 인증 대상이 아니다")
    void activityTypesAreNotPhotoVerified(MissionType missionType) {
        assertThat(missionType.isPhotoVerified()).isFalse();
    }

    @Test
    @DisplayName("모든 미션 타입이 사진/활동 중 한쪽으로 명시 분류되어 있다")
    void allTypesAreClassified() {
        assertThat(MissionType.values()).hasSize(PHOTO_VERIFIED_TYPE_COUNT + ACTIVITY_TYPE_COUNT);
    }
}
