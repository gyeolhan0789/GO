package com.wecandoit.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.scheduling.config.TaskManagementConfigUtils;

class SchedulingConfigTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(SchedulingConfig.class);

    @Test
    @DisplayName("스케줄링은 기본적으로 활성화된다")
    void schedulingIsEnabledByDefault() {
        contextRunner.run(context -> assertThat(context)
                .hasBean(TaskManagementConfigUtils.SCHEDULED_ANNOTATION_PROCESSOR_BEAN_NAME));
    }

    @Test
    @DisplayName("scheduling.enabled가 false이면 스케줄링을 비활성화한다")
    void schedulingCanBeDisabled() {
        contextRunner
                .withPropertyValues("scheduling.enabled=false")
                .run(context -> assertThat(context)
                        .doesNotHaveBean(TaskManagementConfigUtils.SCHEDULED_ANNOTATION_PROCESSOR_BEAN_NAME));
    }
}
