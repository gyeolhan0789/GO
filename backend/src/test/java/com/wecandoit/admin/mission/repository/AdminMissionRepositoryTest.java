package com.wecandoit.admin.mission.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.mission.domain.Mission;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("어드민 미션 레포지토리")
class AdminMissionRepositoryTest {

    @Autowired
    private AdminMissionRepository adminMissionRepository;

    @Test
    @DisplayName("생성일 내림차순으로 미션을 조회한다")
    void findAllByOrderByCreatedAtDescIdDescReturnsNewestFirst() {
        Mission first = adminMissionRepository.save(Mission.create(
                "https://example.com/first.png", "OBJECT", "first", null, null));
        Mission second = adminMissionRepository.save(Mission.create(
                "https://example.com/second.png", "OBJECT", "second", null, null));

        List<Mission> missions = adminMissionRepository.findAllByOrderByCreatedAtDescIdDesc();

        assertThat(missions).extracting(Mission::getId).containsExactly(second.getId(), first.getId());
    }
}
