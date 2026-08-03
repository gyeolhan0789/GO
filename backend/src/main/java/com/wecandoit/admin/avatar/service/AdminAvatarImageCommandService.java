package com.wecandoit.admin.avatar.service;

import com.wecandoit.admin.avatar.controller.response.AdminAvatarImageResponse;
import com.wecandoit.avatar.domain.AvatarImage;
import com.wecandoit.avatar.repository.AvatarImageRepository;
import com.wecandoit.common.storage.ImageUploadService;
import com.wecandoit.member.domain.Gender;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminAvatarImageCommandService {

    private static final String AVATAR_IMAGE_DOMAIN = "avatars";

    private final AvatarImageRepository avatarImageRepository;
    private final ImageUploadService imageUploadService;

    public AdminAvatarImageResponse updateAvatarAsset(Gender gender, MultipartFile image) {
        AvatarImage asset = avatarImageRepository.findByGender(gender)
                .orElseGet(() -> AvatarImage.create(gender, ""));
        String previousImageUrl = asset.getImageUrl();
        String imageUrl = imageUploadService.upload(image, AVATAR_IMAGE_DOMAIN, gender.name().toLowerCase());
        asset.changeImageUrl(imageUrl);
        AvatarImage savedAsset = avatarImageRepository.save(asset);
        imageUploadService.delete(previousImageUrl);
        return AdminAvatarImageResponse.from(savedAsset);
    }
}
