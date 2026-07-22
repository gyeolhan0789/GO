package com.wecandoit.mission.controller;

import com.wecandoit.mission.controller.request.CreateMissionRequest;
import com.wecandoit.mission.controller.response.MissionResponse;
import com.wecandoit.mission.service.MissionService;
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
public class MissionController {

    private final MissionService missionService;

    @GetMapping
    public ResponseEntity<List<MissionResponse>> getMissions() {
        return ResponseEntity.ok(missionService.getMissions());
    }

    @PostMapping
    public ResponseEntity<Void> createMission(@Valid @RequestBody CreateMissionRequest request) {
        missionService.createMission(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
