package com.wecandoit.admin.mission.service;

import com.wecandoit.admin.mission.controller.request.CreateMissionRequest;
import com.wecandoit.admin.mission.controller.request.UpdateMissionRequest;
import com.wecandoit.admin.mission.repository.AdminMissionRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminMissionCommandService {

    private final AdminMissionRepository adminMissionRepository;

    public void createMission(CreateMissionRequest request) {
        validateMissionType(request.type());
        adminMissionRepository.save(Mission.create(
                request.missionImageUrl(),
                request.type(),
                request.title(),
                request.detail(),
                request.decisionCondition() == null ? null : request.decisionCondition().toString()
        ));
    }

    public void updateMission(Long missionId, UpdateMissionRequest request) {
        validateMissionType(request.type());
        Mission mission = findMission(missionId);
        mission.update(
                request.missionImageUrl(),
                request.type(),
                request.title(),
                request.detail(),
                request.decisionCondition() == null ? null : request.decisionCondition().toString()
        );
    }

    public void deactivateMission(Long missionId) {
        findMission(missionId).deactivate();
    }

    private Mission findMission(Long missionId) {
        return adminMissionRepository.findById(missionId)
                .orElseThrow(() -> new CustomException(ErrorCode.MISSION_NOT_FOUND));
    }

    private void validateMissionType(String type) {
        if (!MissionType.contains(type)) {
            throw new CustomException(ErrorCode.INVALID_MISSION_TYPE);
        }
    }
}
