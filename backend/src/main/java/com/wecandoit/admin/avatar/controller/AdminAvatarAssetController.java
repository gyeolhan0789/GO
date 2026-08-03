package com.wecandoit.admin.avatar.controller;

import com.wecandoit.admin.avatar.controller.response.AdminAvatarImageResponse;
import com.wecandoit.admin.avatar.service.AdminAvatarImageCommandService;
import com.wecandoit.admin.avatar.service.AdminAvatarImageReadService;
import com.wecandoit.member.domain.Gender;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/admin/avatar-assets")
@RequiredArgsConstructor
public class AdminAvatarAssetController {

    private final AdminAvatarImageReadService adminAvatarImageReadService;
    private final AdminAvatarImageCommandService adminAvatarImageCommandService;

    @GetMapping
    public ResponseEntity<List<AdminAvatarImageResponse>> getAvatarAssets() {
        return ResponseEntity.ok(adminAvatarImageReadService.getAvatarAssets());
    }

    @GetMapping("/{gender}")
    public ResponseEntity<AdminAvatarImageResponse> getAvatarAsset(@PathVariable Gender gender) {
        return ResponseEntity.ok(adminAvatarImageReadService.getAvatarAsset(gender));
    }

    @PutMapping(value = "/{gender}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AdminAvatarImageResponse> updateAvatarAsset(
            @PathVariable Gender gender,
            @RequestParam("image") MultipartFile image
    ) {
        return ResponseEntity.ok(adminAvatarImageCommandService.updateAvatarAsset(gender, image));
    }
}
