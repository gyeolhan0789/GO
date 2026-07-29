package com.wecandoit.admin.character.controller.response;

import com.wecandoit.character.domain.CharacterImage;
import com.wecandoit.member.domain.Gender;
import java.time.LocalDateTime;

public record AdminCharacterImageResponse(
        Long characterAssetId,
        Gender gender,
        String imageUrl,
        LocalDateTime updatedAt
) {

    public static AdminCharacterImageResponse from(CharacterImage asset) {
        return new AdminCharacterImageResponse(
                asset.getId(),
                asset.getGender(),
                asset.getImageUrl(),
                asset.getUpdatedAt()
        );
    }
}
