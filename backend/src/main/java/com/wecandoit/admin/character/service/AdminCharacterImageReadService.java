package com.wecandoit.admin.character.service;

import com.wecandoit.admin.character.controller.response.AdminCharacterImageResponse;
import com.wecandoit.character.domain.CharacterImage;
import com.wecandoit.character.repository.CharacterImageRepository;
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
public class AdminCharacterImageReadService {

    private final CharacterImageRepository characterImageRepository;

    public List<AdminCharacterImageResponse> getCharacterAssets() {
        return characterImageRepository.findAllByOrderByGenderAsc().stream()
                .map(AdminCharacterImageResponse::from)
                .toList();
    }

    public AdminCharacterImageResponse getCharacterAsset(Gender gender) {
        return AdminCharacterImageResponse.from(findCharacterAsset(gender));
    }

    private CharacterImage findCharacterAsset(Gender gender) {
        return characterImageRepository.findByGender(gender)
                .orElseThrow(() -> new CustomException(ErrorCode.DEFAULT_CHARACTER_ASSET_NOT_FOUND));
    }
}
