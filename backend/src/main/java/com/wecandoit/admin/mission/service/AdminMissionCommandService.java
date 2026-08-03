package com.wecandoit.admin.mission.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wecandoit.admin.mission.controller.request.CreateMissionRequest;
import com.wecandoit.admin.mission.controller.request.UpdateMissionRequest;
import com.wecandoit.admin.mission.repository.AdminMissionRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.storage.ImageUploadService;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionDifficulty;
import com.wecandoit.mission.domain.MissionType;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminMissionCommandService {

    private static final String MISSION_IMAGE_DOMAIN = "missions";

    private final AdminMissionRepository adminMissionRepository;
    private final ImageUploadService imageUploadService;
    private final ObjectMapper objectMapper;

    public void createMission(CreateMissionRequest request, MultipartFile image) {
        MissionType type = MissionType.from(request.type());
        MissionDifficulty difficulty = MissionDifficulty.from(request.difficulty());
        String decisionCondition = parseDecisionCondition(request.decisionCondition());
        String resourceId = UUID.randomUUID().toString();
        String imageUrl = imageUploadService.upload(image, MISSION_IMAGE_DOMAIN, resourceId);
        adminMissionRepository.save(Mission.create(
                imageUrl,
                type,
                request.title(),
                request.detail(),
                decisionCondition,
                difficulty
        ));
    }

    public void updateMission(Long missionId, UpdateMissionRequest request, MultipartFile image) {
        MissionType type = MissionType.from(request.type());
        MissionDifficulty difficulty = MissionDifficulty.from(request.difficulty());
        String decisionCondition = parseDecisionCondition(request.decisionCondition());
        Mission mission = findMission(missionId);
        String previousImageUrl = mission.getMissionImageUrl();
        String imageUrl = null;
        if (image != null && !image.isEmpty()) {
            imageUrl = imageUploadService.upload(image, MISSION_IMAGE_DOMAIN, missionId.toString());
        }
        mission.update(imageUrl, type, request.title(), request.detail(), decisionCondition, difficulty);
        if (imageUrl != null) {
            imageUploadService.delete(previousImageUrl);
        }
    }

    public void deactivateMission(Long missionId) {
        findMission(missionId).deactivate();
    }

    public void activateMission(Long missionId) {
        findMission(missionId).activate();
    }

    private Mission findMission(Long missionId) {
        return adminMissionRepository.findById(missionId)
                .orElseThrow(() -> new CustomException(ErrorCode.MISSION_NOT_FOUND));
    }

    private String parseDecisionCondition(String decisionCondition) {
        if (decisionCondition == null || decisionCondition.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readTree(decisionCondition).toString();
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.INVALID_DECISION_CONDITION);
        }
    }
}
