package com.wecandoit.admin.avatar.service;

import com.wecandoit.admin.avatar.controller.response.AdminAvatarImageResponse;
import com.wecandoit.avatar.domain.AvatarImage;
import com.wecandoit.avatar.repository.AvatarImageRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.member.domain.Gender;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAvatarImageReadService {

    private final AvatarImageRepository avatarImageRepository;

    public List<AdminAvatarImageResponse> getAvatarAssets() {
        return avatarImageRepository.findAllByOrderByGenderAsc().stream()
                .map(AdminAvatarImageResponse::from)
                .toList();
    }

    public AdminAvatarImageResponse getAvatarAsset(Gender gender) {
        return AdminAvatarImageResponse.from(findAvatarAsset(gender));
    }

    private AvatarImage findAvatarAsset(Gender gender) {
        return avatarImageRepository.findByGender(gender)
                .orElseThrow(() -> new CustomException(ErrorCode.DEFAULT_AVATAR_ASSET_NOT_FOUND));
    }
}
