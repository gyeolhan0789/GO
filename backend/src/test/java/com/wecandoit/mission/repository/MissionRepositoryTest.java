package com.wecandoit.mission.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.common.testcontainers.MySqlDataJpaTest;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionType;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

@MySqlDataJpaTest
@DisplayName("미션 저장소")
class MissionRepositoryTest {

    @Autowired
    private MissionRepository missionRepository;

    @Test
    @DisplayName("요청한 개수만큼 중복 없이 무작위 미션을 조회한다")
    void findRandomMissionsReturnsDistinctMissions() {
        // given
        for (int i = 0; i < 5; i++) {
            saveMission("미션" + i);
        }

        // when
        List<Mission> missions = missionRepository.findRandomMissions(3);

        // then
        assertThat(missions).hasSize(3);
        assertThat(missions).extracting(Mission::getId).doesNotHaveDuplicates();
    }

    @Test
    @DisplayName("요청한 개수보다 미션이 적으면 존재하는 만큼만 조회한다")
    void findRandomMissionsReturnsFewerWhenPoolIsSmall() {
        // given
        saveMission("미션1");
        saveMission("미션2");

        // when
        List<Mission> missions = missionRepository.findRandomMissions(5);

        // then
        assertThat(missions).hasSize(2);
    }

    private Mission saveMission(String title) {
        return missionRepository.save(Mission.create(
                "https://example.com/mission.png",
                MissionType.OBJECT,
                title,
                "설명",
                null
        ));
    }
}
