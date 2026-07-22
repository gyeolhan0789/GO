package com.wecandoit.mission.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.mission.controller.request.CreateMissionRequest;
import com.wecandoit.mission.controller.response.MissionResponse;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionType;
import com.wecandoit.mission.repository.MissionRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class MissionService {

    private final MissionRepository missionRepository;

    public void createMission(CreateMissionRequest request) {
        validateMissionType(request.type());
        missionRepository.save(Mission.create(
                request.missionImageUrl(),
                request.type(),
                request.title(),
                request.detail(),
                request.decisionCondition() == null ? null : request.decisionCondition().toString()
        ));
    }

    @Transactional(readOnly = true)
    public List<MissionResponse> getMissions() {
        return missionRepository.findAllByOrderByCreatedAtDescIdDesc().stream()
                .map(MissionResponse::from)
                .toList();
    }

    private void validateMissionType(String type) {
        if (!MissionType.contains(type)) {
            throw new CustomException(ErrorCode.INVALID_MISSION_TYPE);
        }
    }
}
