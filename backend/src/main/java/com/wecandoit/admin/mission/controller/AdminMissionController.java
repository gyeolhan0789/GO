package com.wecandoit.admin.mission.controller;

import com.wecandoit.admin.mission.controller.request.CreateMissionRequest;
import com.wecandoit.admin.mission.controller.response.AdminMissionResponse;
import com.wecandoit.admin.mission.service.AdminMissionCommandService;
import com.wecandoit.admin.mission.service.AdminMissionReadService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/missions")
@RequiredArgsConstructor
public class AdminMissionController {

    private final AdminMissionCommandService adminMissionCommandService;
    private final AdminMissionReadService adminMissionReadService;

    @GetMapping
    public ResponseEntity<List<AdminMissionResponse>> getMissions() {
        return ResponseEntity.ok(adminMissionReadService.getMissions());
    }

    @PostMapping
    public ResponseEntity<Void> createMission(@Valid @RequestBody CreateMissionRequest request) {
        adminMissionCommandService.createMission(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
