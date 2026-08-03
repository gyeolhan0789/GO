package com.wecandoit.admin.avatar.controller.response;

import com.wecandoit.avatar.domain.AvatarImage;
import com.wecandoit.member.domain.Gender;
import java.time.LocalDateTime;

public record AdminAvatarImageResponse(
        Long avatarAssetId,
        Gender gender,
        String imageUrl,
        LocalDateTime updatedAt
) {

    public static AdminAvatarImageResponse from(AvatarImage asset) {
        return new AdminAvatarImageResponse(
                asset.getId(),
                asset.getGender(),
                asset.getImageUrl(),
                asset.getUpdatedAt()
        );
    }
}
