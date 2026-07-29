package com.wecandoit.admin.character.controller;

import com.wecandoit.admin.character.controller.response.AdminCharacterImageResponse;
import com.wecandoit.admin.character.service.AdminCharacterImageCommandService;
import com.wecandoit.admin.character.service.AdminCharacterImageReadService;
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
@RequestMapping("/admin/character-assets")
@RequiredArgsConstructor
public class AdminCharacterImageController {

    private final AdminCharacterImageCommandService adminCharacterImageCommandService;
    private final AdminCharacterImageReadService adminCharacterImageReadService;

    @GetMapping
    public ResponseEntity<List<AdminCharacterImageResponse>> getCharacterAssets() {
        return ResponseEntity.ok(adminCharacterImageReadService.getCharacterAssets());
    }

    @GetMapping("/{gender}")
    public ResponseEntity<AdminCharacterImageResponse> getCharacterAsset(@PathVariable Gender gender) {
        return ResponseEntity.ok(adminCharacterImageReadService.getCharacterAsset(gender));
    }

    @PutMapping(value = "/{gender}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AdminCharacterImageResponse> updateCharacterAsset(
            @PathVariable Gender gender,
            @RequestParam("image") MultipartFile image
    ) {
        return ResponseEntity.ok(adminCharacterImageCommandService.updateCharacterAsset(gender, image));
    }
}
