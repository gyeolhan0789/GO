package com.wecandoit.admin.mission.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.common.testcontainers.MySqlDataJpaTest;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionType;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

@MySqlDataJpaTest
@DisplayName("어드민 미션 레포지토리")
class AdminMissionRepositoryTest {

    @Autowired
    private AdminMissionRepository adminMissionRepository;

    @Test
    @DisplayName("생성일 내림차순으로 미션을 조회한다")
    void findAllByOrderByCreatedAtDescIdDescReturnsNewestFirst() {
        // given
        Mission first = adminMissionRepository.save(Mission.create(
                "https://example.com/first.png", MissionType.OBJECT, "first", null, null));
        Mission second = adminMissionRepository.save(Mission.create(
                "https://example.com/second.png", MissionType.OBJECT, "second", null, null));

        // when
        List<Mission> missions = adminMissionRepository.findAllByOrderByCreatedAtDescIdDesc();

        // then
        assertThat(missions).extracting(Mission::getId).containsExactly(second.getId(), first.getId());
    }
}
