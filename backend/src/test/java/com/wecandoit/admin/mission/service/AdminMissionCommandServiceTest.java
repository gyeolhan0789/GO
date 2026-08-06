package com.wecandoit.admin.mission.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wecandoit.admin.mission.controller.request.CreateMissionRequest;
import com.wecandoit.admin.mission.controller.request.UpdateMissionRequest;
import com.wecandoit.admin.mission.repository.AdminMissionRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.storage.ImageUploadService;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionType;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

@DisplayName("미션 커맨드 서비스")
@ExtendWith(MockitoExtension.class)
class AdminMissionCommandServiceTest {

    @Mock
    private AdminMissionRepository adminMissionRepository;
    @Mock
    private ImageUploadService imageUploadService;
    @Mock
    private MultipartFile image;
    private AdminMissionCommandService adminMissionCommandService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        adminMissionCommandService =
                new AdminMissionCommandService(adminMissionRepository, imageUploadService, objectMapper);
    }

    @Test
    @DisplayName("결정 조건 JSON을 포함한 미션을 저장한다")
    void createMissionSavesMission() {
        // given
        CreateMissionRequest request = new CreateMissionRequest(
                "OBJECT",
                "LOW",
                "Red flower",
                "Find a red flower",
                "{\"target\":\"flower\",\"constraints\":{\"color\":\"red\"}}"
        );
        given(imageUploadService.upload(
                ArgumentMatchers.eq(image), ArgumentMatchers.eq("missions"), ArgumentMatchers.anyString()))
                .willReturn("https://example.com/flower.png");

        // when
        adminMissionCommandService.createMission(request, image);

        // then
        ArgumentCaptor<Mission> captor = ArgumentCaptor.forClass(Mission.class);
        then(adminMissionRepository).should().save(captor.capture());
        Mission mission = captor.getValue();
        assertThat(mission.getMissionImageUrl()).isEqualTo("https://example.com/flower.png");
        assertThat(mission.getType()).isEqualTo(MissionType.OBJECT);
        assertThat(mission.getTitle()).isEqualTo("Red flower");
        assertThat(mission.getDetail()).isEqualTo("Find a red flower");
        assertThat(mission.getDecisionCondition())
                .isEqualTo("{\"target\":\"flower\",\"constraints\":{\"color\":\"red\"}}");
    }

    @Test
    @DisplayName("일반 미션 타입을 저장할 수 있다")
    void createMissionAcceptsOrdinaryType() {
        // given
        CreateMissionRequest request = new CreateMissionRequest("ORDINARY", "LOW", "Walk", "Walk outside", null);
        given(imageUploadService.upload(
                ArgumentMatchers.eq(image), ArgumentMatchers.eq("missions"), ArgumentMatchers.anyString()))
                .willReturn("https://example.com/walk.png");

        // when
        adminMissionCommandService.createMission(request, image);

        // then
        ArgumentCaptor<Mission> captor = ArgumentCaptor.forClass(Mission.class);
        then(adminMissionRepository).should().save(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(MissionType.ORDINARY);
    }

    @Test
    @DisplayName("지원하지 않는 미션 타입이면 예외가 발생한다")
    void createMissionRejectsUnsupportedType() {
        // given
        CreateMissionRequest request = new CreateMissionRequest("COLOR", "LOW", null, null, null);

        // when & then
        assertThatThrownBy(() -> adminMissionCommandService.createMission(request, image))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_MISSION_TYPE);
        then(adminMissionRepository).shouldHaveNoInteractions();
        then(imageUploadService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("결정 조건이 올바른 JSON이 아니면 예외가 발생한다")
    void createMissionRejectsInvalidDecisionCondition() {
        // given
        CreateMissionRequest request = new CreateMissionRequest("OBJECT", "LOW", null, null, "not-json");

        // when & then
        assertThatThrownBy(() -> adminMissionCommandService.createMission(request, image))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_DECISION_CONDITION);
        then(imageUploadService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("존재하는 미션을 수정한다")
    void updateMissionUpdatesExistingMission() {
        // given
        Mission mission = Mission.create(
                "https://example.com/flower.png", MissionType.OBJECT, "Red flower", "Find it", null);
        given(adminMissionRepository.findById(1L)).willReturn(Optional.of(mission));
        given(image.isEmpty()).willReturn(true);
        UpdateMissionRequest request =
                new UpdateMissionRequest("RELATION", "HIGH", "Updated flower", "Find the updated flower", null);

        // when
        adminMissionCommandService.updateMission(1L, request, image);

        // then
        assertThat(mission.getMissionImageUrl()).isEqualTo("https://example.com/flower.png");
        assertThat(mission.getType()).isEqualTo(MissionType.RELATION);
        assertThat(mission.getTitle()).isEqualTo("Updated flower");
        assertThat(mission.getDetail()).isEqualTo("Find the updated flower");
        then(imageUploadService).should(never())
                .upload(ArgumentMatchers.any(), ArgumentMatchers.anyString(), ArgumentMatchers.anyString());
    }

    @Test
    @DisplayName("새 이미지로 수정하면 기존 이미지를 삭제한다")
    void updateMissionReplacesImage() {
        // given
        Mission mission = Mission.create(
                "https://example.com/old.png", MissionType.OBJECT, "Red flower", "Find it", null);
        given(adminMissionRepository.findById(1L)).willReturn(Optional.of(mission));
        given(image.isEmpty()).willReturn(false);
        given(imageUploadService.upload(image, "missions", "1")).willReturn("https://example.com/new.png");
        UpdateMissionRequest request = new UpdateMissionRequest("OBJECT", "LOW", "Red flower", "Find it", null);

        // when
        adminMissionCommandService.updateMission(1L, request, image);

        // then
        assertThat(mission.getMissionImageUrl()).isEqualTo("https://example.com/new.png");
        then(imageUploadService).should().delete("https://example.com/old.png");
    }

    @Test
    @DisplayName("존재하지 않는 미션을 수정하면 예외가 발생한다")
    void updateMissionRejectsMissingMission() {
        // given
        given(adminMissionRepository.findById(1L)).willReturn(Optional.empty());
        UpdateMissionRequest request = new UpdateMissionRequest("OBJECT", "LOW", null, null, null);

        // when & then
        assertThatThrownBy(() -> adminMissionCommandService.updateMission(1L, request, image))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MISSION_NOT_FOUND);
    }

    @Test
    @DisplayName("수정 시 지원하지 않는 미션 타입이면 예외가 발생한다")
    void updateMissionRejectsUnsupportedType() {
        // given
        UpdateMissionRequest request = new UpdateMissionRequest("COLOR", "LOW", null, null, null);

        // when & then
        assertThatThrownBy(() -> adminMissionCommandService.updateMission(1L, request, image))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_MISSION_TYPE);
        then(adminMissionRepository).should(never()).findById(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("미션을 비활성화한다")
    void deactivateMissionDeactivatesExistingMission() {
        // given
        Mission mission = Mission.create(
                "https://example.com/flower.png", MissionType.OBJECT, "Red flower", "Find it", null);
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

    @Test
    @DisplayName("미션을 활성화한다")
    void activateMissionActivatesExistingMission() {
        // given
        Mission mission = Mission.create(
                "https://example.com/flower.png", MissionType.OBJECT, "Red flower", "Find it", null);
        mission.deactivate();
        given(adminMissionRepository.findById(1L)).willReturn(Optional.of(mission));

        // when
        adminMissionCommandService.activateMission(1L);

        // then
        assertThat(mission.isActive()).isTrue();
    }

    @Test
    @DisplayName("존재하지 않는 미션을 활성화하면 예외가 발생한다")
    void activateMissionRejectsMissingMission() {
        // given
        given(adminMissionRepository.findById(1L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> adminMissionCommandService.activateMission(1L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MISSION_NOT_FOUND);
    }
}
