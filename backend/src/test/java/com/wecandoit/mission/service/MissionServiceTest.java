package com.wecandoit.mission.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.mission.controller.request.CreateMissionRequest;
import com.wecandoit.mission.controller.response.MissionResponse;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.repository.MissionRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("미션 서비스")
class MissionServiceTest {

    private final MissionRepository missionRepository = Mockito.mock(MissionRepository.class);
    private final MissionService missionService = new MissionService(missionRepository);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("결정 조건 JSON을 포함한 미션을 저장한다")
    void createMissionSavesMission() throws Exception {
        // given
        CreateMissionRequest request = new CreateMissionRequest(
                "https://example.com/flower.png",
                "OBJECT",
                "Red flower",
                "Find a red flower",
                objectMapper.readTree("{\"target\":\"flower\",\"constraints\":{\"color\":\"red\"}}")
        );

        // when
        missionService.createMission(request);

        // then
        ArgumentCaptor<Mission> captor = ArgumentCaptor.forClass(Mission.class);
        verify(missionRepository).save(captor.capture());
        Mission mission = captor.getValue();
        assertThat(mission.getMissionImageUrl()).isEqualTo("https://example.com/flower.png");
        assertThat(mission.getType()).isEqualTo("OBJECT");
        assertThat(mission.getTitle()).isEqualTo("Red flower");
        assertThat(mission.getDetail()).isEqualTo("Find a red flower");
        assertThat(mission.getDecisionCondition())
                .isEqualTo("{\"target\":\"flower\",\"constraints\":{\"color\":\"red\"}}");
    }

    @Test
    @DisplayName("지원하지 않는 미션 타입이면 예외가 발생한다")
    void createMissionRejectsUnsupportedType() {
        // given
        CreateMissionRequest request = new CreateMissionRequest(
                "https://example.com/flower.png",
                "COLOR",
                null,
                null,
                null
        );

        // when, then
        assertThatThrownBy(() -> missionService.createMission(request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_MISSION_TYPE);
        verifyNoInteractions(missionRepository);
    }

    @Test
    @DisplayName("최신순 미션 목록을 응답으로 변환한다")
    void getMissionsMapsRepositoryResults() {
        // given
        Mission mission = Mission.create("https://example.com/new.png", "OBJECT", "새 미션", null, null);
        ReflectionTestUtils.setField(mission, "id", 2L);
        ReflectionTestUtils.setField(mission, "createdAt", LocalDateTime.of(2026, 7, 22, 12, 0));
        when(missionRepository.findAllByOrderByCreatedAtDescIdDesc()).thenReturn(List.of(mission));

        // when
        List<MissionResponse> responses = missionService.getMissions();

        // then
        assertThat(responses).extracting(MissionResponse::missionId).containsExactly(2L);
        assertThat(responses.getFirst().createdAt()).isEqualTo(LocalDateTime.of(2026, 7, 22, 12, 0));
    }
}
