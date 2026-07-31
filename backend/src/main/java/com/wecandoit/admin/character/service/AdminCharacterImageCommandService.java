package com.wecandoit.admin.character.service;

import com.wecandoit.admin.character.controller.response.AdminCharacterImageResponse;
import com.wecandoit.character.domain.CharacterImage;
import com.wecandoit.character.repository.CharacterImageRepository;
import com.wecandoit.common.storage.ImageUploadService;
import com.wecandoit.member.domain.Gender;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminCharacterImageCommandService {

    private static final String CHARACTER_IMAGE_DOMAIN = "characters";

    private final CharacterImageRepository characterImageRepository;
    private final ImageUploadService imageUploadService;

    public AdminCharacterImageResponse updateCharacterAsset(Gender gender, MultipartFile image) {
        CharacterImage asset = characterImageRepository.findByGender(gender)
                .orElseGet(() -> CharacterImage.create(gender, ""));
        String previousImageUrl = asset.getImageUrl();
        String imageUrl = imageUploadService.upload(image, CHARACTER_IMAGE_DOMAIN, gender.name().toLowerCase());
        asset.changeImageUrl(imageUrl);
        CharacterImage savedAsset = characterImageRepository.save(asset);
        imageUploadService.delete(previousImageUrl);
        return AdminCharacterImageResponse.from(savedAsset);
    }
}
