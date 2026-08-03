package com.wecandoit.admin.mission.controller;

import com.wecandoit.admin.mission.controller.request.CreateMissionRequest;
import com.wecandoit.admin.mission.controller.request.UpdateMissionRequest;
import com.wecandoit.admin.mission.controller.response.AdminMissionResponse;
import com.wecandoit.admin.mission.service.AdminMissionCommandService;
import com.wecandoit.admin.mission.service.AdminMissionReadService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> createMission(
            @Valid @ModelAttribute CreateMissionRequest request,
            @RequestPart("image") MultipartFile image
    ) {
        adminMissionCommandService.createMission(request, image);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PutMapping(value = "/{missionId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> updateMission(
            @PathVariable Long missionId,
            @Valid @ModelAttribute UpdateMissionRequest request,
            @RequestPart(value = "image", required = false) MultipartFile image
    ) {
        adminMissionCommandService.updateMission(missionId, request, image);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{missionId}")
    public ResponseEntity<Void> deactivateMission(@PathVariable Long missionId) {
        adminMissionCommandService.deactivateMission(missionId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{missionId}/activate")
    public ResponseEntity<Void> activateMission(@PathVariable Long missionId) {
        adminMissionCommandService.activateMission(missionId);
        return ResponseEntity.noContent().build();
    }
}
