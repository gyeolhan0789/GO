package com.wecandoit.admin.mission.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.admin.mission.controller.request.CreateMissionRequest;
import com.wecandoit.admin.mission.controller.request.UpdateMissionRequest;
import com.wecandoit.admin.mission.repository.AdminMissionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.mission.domain.Mission;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@DisplayName("미션 커맨드 서비스")
@ExtendWith(MockitoExtension.class)
class AdminMissionCommandServiceTest {

    @Mock
    private AdminMissionRepository adminMissionRepository;
    private AdminMissionCommandService adminMissionCommandService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        adminMissionCommandService = new AdminMissionCommandService(adminMissionRepository);
    }

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
        adminMissionCommandService.createMission(request);

        // then
        ArgumentCaptor<Mission> captor = ArgumentCaptor.forClass(Mission.class);
        then(adminMissionRepository).should().save(captor.capture());
        Mission mission = captor.getValue();
        assertThat(mission.getMissionImageUrl()).isEqualTo("https://example.com/flower.png");
        assertThat(mission.getType()).isEqualTo("OBJECT");
        assertThat(mission.getTitle()).isEqualTo("Red flower");
        assertThat(mission.getDetail()).isEqualTo("Find a red flower");
        assertThat(mission.getDecisionCondition())
                .isEqualTo("{\"target\":\"flower\",\"constraints\":{\"color\":\"red\"}}");
    }

    @Test
    @DisplayName("일반 미션 타입을 저장할 수 있다")
    void createMissionAcceptsOrdinaryType() {
        // given
        CreateMissionRequest request = new CreateMissionRequest(
                "https://example.com/walk.png",
                "ORDINARY",
                "Walk",
                "Walk outside",
                null
        );

        // when
        adminMissionCommandService.createMission(request);

        // then
        ArgumentCaptor<Mission> captor = ArgumentCaptor.forClass(Mission.class);
        then(adminMissionRepository).should().save(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo("ORDINARY");
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

        // when & then
        assertThatThrownBy(() -> adminMissionCommandService.createMission(request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_MISSION_TYPE);
        then(adminMissionRepository).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("존재하는 미션을 수정한다")
    void updateMissionUpdatesExistingMission() {
        // given
        Mission mission = Mission.create("https://example.com/flower.png", "OBJECT", "Red flower", "Find it", null);
        given(adminMissionRepository.findById(1L)).willReturn(Optional.of(mission));
        UpdateMissionRequest request = new UpdateMissionRequest(
                "https://example.com/updated.png",
                "RELATION",
                "Updated flower",
                "Find the updated flower",
                null
        );

        // when
        adminMissionCommandService.updateMission(1L, request);

        // then
        assertThat(mission.getMissionImageUrl()).isEqualTo("https://example.com/updated.png");
        assertThat(mission.getType()).isEqualTo("RELATION");
        assertThat(mission.getTitle()).isEqualTo("Updated flower");
        assertThat(mission.getDetail()).isEqualTo("Find the updated flower");
    }

    @Test
    @DisplayName("존재하지 않는 미션을 수정하면 예외가 발생한다")
    void updateMissionRejectsMissingMission() {
        // given
        given(adminMissionRepository.findById(1L)).willReturn(Optional.empty());
        UpdateMissionRequest request = new UpdateMissionRequest(
                "https://example.com/updated.png", "OBJECT", null, null, null);

        // when & then
        assertThatThrownBy(() -> adminMissionCommandService.updateMission(1L, request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MISSION_NOT_FOUND);
    }

    @Test
    @DisplayName("수정 시 지원하지 않는 미션 타입이면 예외가 발생한다")
    void updateMissionRejectsUnsupportedType() {
        // given
        UpdateMissionRequest request = new UpdateMissionRequest(
                "https://example.com/flower.png", "COLOR", null, null, null);

        // when & then
        assertThatThrownBy(() -> adminMissionCommandService.updateMission(1L, request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_MISSION_TYPE);
        then(adminMissionRepository).should(org.mockito.Mockito.never()).findById(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("미션을 비활성화한다")
    void deactivateMissionDeactivatesExistingMission() {
        // given
        Mission mission = Mission.create("https://example.com/flower.png", "OBJECT", "Red flower", "Find it", null);
        given(adminMissionRepository.findById(1L)).willReturn(Optional.of(mission));

        // when
        adminMissionCommandService.deactivateMission(1L);

        // then
        assertThat(mission.isActive()).isFalse();
    }

    @Test
    @DisplayName("존재하지 않는 미션을 비활성화하면 예외가 발생한다")
    void deactivateMissionRejectsMissingMission() {
        // given
        given(adminMissionRepository.findById(1L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> adminMissionCommandService.deactivateMission(1L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MISSION_NOT_FOUND);
    }
}
