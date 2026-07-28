package com.wecandoit.admin.mission.controller;

import com.wecandoit.admin.mission.controller.response.MissionImageUploadResponse;
import com.wecandoit.common.storage.ImageUploadService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/admin/missions/images")
@RequiredArgsConstructor
public class AdminMissionImageController {

    private static final String MISSION_IMAGE_DOMAIN = "missions";

    private final ImageUploadService imageUploadService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MissionImageUploadResponse> uploadMissionImage(
            @RequestParam("image") MultipartFile image) {
        String resourceId = UUID.randomUUID().toString();
        String imageUrl = imageUploadService.upload(image, MISSION_IMAGE_DOMAIN, resourceId);
        return ResponseEntity.status(HttpStatus.CREATED).body(new MissionImageUploadResponse(imageUrl));
    }
}
