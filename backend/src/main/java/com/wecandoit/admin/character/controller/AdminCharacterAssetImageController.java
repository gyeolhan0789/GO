package com.wecandoit.admin.character.controller;

import com.wecandoit.admin.character.controller.response.AdminCharacterImageResponse;
import com.wecandoit.admin.character.service.AdminCharacterImageCommandService;
import com.wecandoit.member.domain.Gender;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/admin/character-assets")
@RequiredArgsConstructor
public class AdminCharacterAssetImageController {

    private final AdminCharacterImageCommandService adminCharacterImageCommandService;

    @PutMapping(value = "/{gender}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AdminCharacterImageResponse> updateCharacterAsset(
            @PathVariable Gender gender,
            @RequestParam("image") MultipartFile image
    ) {
        return ResponseEntity.ok(adminCharacterImageCommandService.updateCharacterAsset(gender, image));
    }
}
