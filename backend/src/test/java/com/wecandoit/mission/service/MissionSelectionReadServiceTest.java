package com.wecandoit.mission.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionDifficulty;
import com.wecandoit.mission.domain.MissionType;
import com.wecandoit.mission.repository.MissionPoolCount;
import com.wecandoit.mission.repository.MissionRepository;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@DisplayName("보드 미션 선택 서비스")
@ExtendWith(MockitoExtension.class)
class MissionSelectionReadServiceTest {

    private static final int BOARD_CELL_COUNT = 9;

    @Mock
    private MissionRepository missionRepository;
    @InjectMocks
    private MissionSelectionReadService missionSelectionReadService;

    @Test
    @DisplayName("활성 미션 pool의 사진 인증 비율을 그대로 반영해 보드 미션을 선택한다")
    void selectBoardMissionsMirrorsPhotoVerifiedRatioOfPool() {
        // given
        given(missionRepository.countActiveMissionsByTypeAndDifficulty()).willReturn(List.of(
                new MissionPoolCount(MissionType.OBJECT, MissionDifficulty.MEDIUM, 90),
                new MissionPoolCount(MissionType.STEP_TOTAL, MissionDifficulty.MEDIUM, 10)
        ));
        givenPoolWithEnoughMissions();

        // when
        List<Mission> missions = missionSelectionReadService.selectBoardMissions(BOARD_CELL_COUNT);

        // then
        assertThat(countByPhotoVerified(missions))
                .containsExactlyInAnyOrderEntriesOf(Map.of(true, 8L, false, 1L));
    }

    @Test
    @DisplayName("활성 미션 pool의 난이도 비율을 그대로 반영해 보드 미션을 선택한다")
    void selectBoardMissionsMirrorsDifficultyRatioOfPool() {
        // given
        given(missionRepository.countActiveMissionsByTypeAndDifficulty()).willReturn(List.of(
                new MissionPoolCount(MissionType.OBJECT, MissionDifficulty.LOW, 25),
                new MissionPoolCount(MissionType.OBJECT, MissionDifficulty.MEDIUM, 50),
                new MissionPoolCount(MissionType.OBJECT, MissionDifficulty.HIGH, 25)
        ));
        givenPoolWithEnoughMissions();

        // when
        List<Mission> missions = missionSelectionReadService.selectBoardMissions(BOARD_CELL_COUNT);

        // then
        assertThat(countByDifficulty(missions)).containsExactlyInAnyOrderEntriesOf(Map.of(
                MissionDifficulty.LOW, 2L,
                MissionDifficulty.MEDIUM, 5L,
                MissionDifficulty.HIGH, 2L
        ));
    }

    @Test
    @DisplayName("한 조합의 미션이 부족해도 같은 타입의 다른 난이도로 보드를 모두 채운다")
    void selectBoardMissionsFillsBoardWithSameTypeWhenBucketIsShort() {
        // given
        given(missionRepository.countActiveMissionsByTypeAndDifficulty()).willReturn(List.of(
                new MissionPoolCount(MissionType.OBJECT, MissionDifficulty.MEDIUM, 40),
                new MissionPoolCount(MissionType.OBJECT, MissionDifficulty.HIGH, 20),
                new MissionPoolCount(MissionType.STEP_TOTAL, MissionDifficulty.MEDIUM, 40)
        ));
        givenPoolWithEnoughMissions();

        // when
        List<Mission> missions = missionSelectionReadService.selectBoardMissions(BOARD_CELL_COUNT);

        // then
        assertThat(countByPhotoVerified(missions))
                .containsExactlyInAnyOrderEntriesOf(Map.of(true, 5L, false, 4L));
    }

    @Test
    @DisplayName("활성 미션이 보드 칸 수보다 적으면 미션 부족 예외가 발생한다")
    void selectBoardMissionsThrowsWhenPoolIsInsufficient() {
        // given
        given(missionRepository.countActiveMissionsByTypeAndDifficulty()).willReturn(
                List.of(new MissionPoolCount(MissionType.OBJECT, MissionDifficulty.MEDIUM, 5))
        );
        given(missionRepository.findRandomActiveMissions(anyCollection(), anyString(), anyInt()))
                .willReturn(missions(MissionType.OBJECT, MissionDifficulty.MEDIUM, 5));

        // when & then
        assertThatThrownBy(() -> missionSelectionReadService.selectBoardMissions(BOARD_CELL_COUNT))
                .isInstanceOf(CustomException.class)
                .extracting(exception -> ((CustomException) exception).getErrorCode())
                .isEqualTo(ErrorCode.MISSION_POOL_INSUFFICIENT);
    }

    private void givenPoolWithEnoughMissions() {
        given(missionRepository.findRandomActiveMissions(anyCollection(), anyString(), anyInt()))
                .willAnswer(invocation -> {
                    Collection<String> typeNames = invocation.getArgument(0);
                    MissionType type = typeNames.contains(MissionType.OBJECT.name())
                            ? MissionType.OBJECT
                            : MissionType.STEP_TOTAL;
                    return missions(
                            type,
                            MissionDifficulty.from(invocation.getArgument(1)),
                            invocation.getArgument(2)
                    );
                });
    }

    private List<Mission> missions(MissionType type, MissionDifficulty difficulty, int count) {
        return IntStream.range(0, count)
                .mapToObj(index -> Mission.create(
                        "https://example.com/mission.png",
                        type,
                        "미션",
                        "설명",
                        null,
                        difficulty
                ))
                .toList();
    }

    private Map<Boolean, Long> countByPhotoVerified(List<Mission> missions) {
        return missions.stream().collect(Collectors.groupingBy(
                mission -> mission.getType().isPhotoVerified(),
                Collectors.counting()
        ));
    }

    private Map<MissionDifficulty, Long> countByDifficulty(List<Mission> missions) {
        return missions.stream().collect(Collectors.groupingBy(
                Mission::getDifficulty,
                Collectors.counting()
        ));
    }
}
