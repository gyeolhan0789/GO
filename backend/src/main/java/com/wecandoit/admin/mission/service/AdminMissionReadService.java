package com.wecandoit.admin.mission.service;

import com.wecandoit.admin.mission.controller.response.AdminMissionResponse;
import com.wecandoit.admin.mission.repository.AdminMissionRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminMissionReadService {

    private final AdminMissionRepository adminMissionRepository;

    public List<AdminMissionResponse> getMissions() {
        return adminMissionRepository.findAllByOrderByCreatedAtDescIdDesc().stream()
                .map(AdminMissionResponse::from)
                .toList();
    }
}
