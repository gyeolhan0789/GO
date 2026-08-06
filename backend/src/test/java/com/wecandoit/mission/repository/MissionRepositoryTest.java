package com.wecandoit.mission.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.common.testcontainers.MySqlDataJpaTest;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionDifficulty;
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
    void findRandomActiveMissionsReturnsDistinctMissions() {
        // given
        for (int index = 0; index < 5; index++) {
            saveMission("미션" + index, MissionType.OBJECT, MissionDifficulty.MEDIUM);
        }

        // when
        List<Mission> missions = findRandomPhotoVerifiedMissions(MissionDifficulty.MEDIUM, 3);

        // then
        assertThat(missions).hasSize(3);
        assertThat(missions).extracting(Mission::getId).doesNotHaveDuplicates();
    }

    @Test
    @DisplayName("요청한 개수보다 미션이 적으면 존재하는 만큼만 조회한다")
    void findRandomActiveMissionsReturnsFewerWhenPoolIsSmall() {
        // given
        saveMission("미션1", MissionType.OBJECT, MissionDifficulty.MEDIUM);
        saveMission("미션2", MissionType.OBJECT, MissionDifficulty.MEDIUM);

        // when
        List<Mission> missions = findRandomPhotoVerifiedMissions(MissionDifficulty.MEDIUM, 5);

        // then
        assertThat(missions).hasSize(2);
    }

    @Test
    @DisplayName("요청한 타입과 난이도에 해당하지 않는 미션은 무작위 조회에서 제외한다")
    void findRandomActiveMissionsExcludesOtherBuckets() {
        // given
        Mission target = saveMission("사진 상 미션", MissionType.OBJECT, MissionDifficulty.HIGH);
        saveMission("사진 중 미션", MissionType.OBJECT, MissionDifficulty.MEDIUM);
        saveMission("활동 상 미션", MissionType.STEP_TOTAL, MissionDifficulty.HIGH);

        // when
        List<Mission> missions = findRandomPhotoVerifiedMissions(MissionDifficulty.HIGH, 5);

        // then
        assertThat(missions).extracting(Mission::getId).containsExactly(target.getId());
    }

    @Test
    @DisplayName("활성 미션 개수를 타입과 난이도별로 집계한다")
    void countActiveMissionsByTypeAndDifficultyGroupsPool() {
        // given
        saveMission("사진 중 미션1", MissionType.OBJECT, MissionDifficulty.MEDIUM);
        saveMission("사진 중 미션2", MissionType.OBJECT, MissionDifficulty.MEDIUM);
        saveMission("활동 상 미션", MissionType.STEP_TOTAL, MissionDifficulty.HIGH);

        // when
        List<MissionPoolCount> poolCounts = missionRepository.countActiveMissionsByTypeAndDifficulty();

        // then
        assertThat(poolCounts).containsExactlyInAnyOrder(
                new MissionPoolCount(MissionType.OBJECT, MissionDifficulty.MEDIUM, 2),
                new MissionPoolCount(MissionType.STEP_TOTAL, MissionDifficulty.HIGH, 1)
        );
    }

    @Test
    @DisplayName("비활성 미션은 타입과 난이도 집계에서 제외한다")
    void countActiveMissionsByTypeAndDifficultyExcludesInactiveMissions() {
        // given
        saveMission("활성 미션", MissionType.OBJECT, MissionDifficulty.MEDIUM);
        Mission inactiveMission = saveMission("비활성 미션", MissionType.OBJECT, MissionDifficulty.MEDIUM);
        inactiveMission.deactivate();
        missionRepository.saveAndFlush(inactiveMission);

        // when
        List<MissionPoolCount> poolCounts = missionRepository.countActiveMissionsByTypeAndDifficulty();

        // then
        assertThat(poolCounts).containsExactly(
                new MissionPoolCount(MissionType.OBJECT, MissionDifficulty.MEDIUM, 1)
        );
    }

    private List<Mission> findRandomPhotoVerifiedMissions(MissionDifficulty difficulty, int count) {
        return missionRepository.findRandomActiveMissions(
                MissionType.namesByPhotoVerified(true),
                difficulty.name(),
                count
        );
    }

    private Mission saveMission(String title, MissionType type, MissionDifficulty difficulty) {
        return missionRepository.save(Mission.create(
                "https://example.com/mission.png",
                type,
                title,
                "설명",
                null,
                difficulty
        ));
    }
}
