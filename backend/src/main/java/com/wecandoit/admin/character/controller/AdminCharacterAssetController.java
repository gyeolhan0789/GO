package com.wecandoit.admin.character.controller;

import com.wecandoit.admin.character.controller.response.AdminCharacterImageResponse;
import com.wecandoit.admin.character.service.AdminCharacterImageReadService;
import com.wecandoit.member.domain.Gender;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/character-assets")
@RequiredArgsConstructor
public class AdminCharacterAssetController {

    private final AdminCharacterImageReadService adminCharacterImageReadService;

    @GetMapping
    public ResponseEntity<List<AdminCharacterImageResponse>> getCharacterAssets() {
        return ResponseEntity.ok(adminCharacterImageReadService.getCharacterAssets());
    }

    @GetMapping("/{gender}")
    public ResponseEntity<AdminCharacterImageResponse> getCharacterAsset(@PathVariable Gender gender) {
        return ResponseEntity.ok(adminCharacterImageReadService.getCharacterAsset(gender));
    }
}
