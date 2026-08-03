package com.wecandoit.admin.avatar.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.admin.avatar.controller.response.AdminAvatarImageResponse;
import com.wecandoit.avatar.domain.AvatarImage;
import com.wecandoit.avatar.repository.AvatarImageRepository;
import com.wecandoit.common.storage.ImageUploadService;
import com.wecandoit.member.domain.Gender;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

@ExtendWith(MockitoExtension.class)
@DisplayName("어드민 기본 아바타 에셋 변경 서비스")
class AdminAvatarImageCommandServiceTest {

    @Mock
    private AvatarImageRepository avatarImageRepository;
    @Mock
    private ImageUploadService imageUploadService;
    @Mock
    private MultipartFile image;
    private AdminAvatarImageCommandService adminAvatarImageCommandService;

    @BeforeEach
    void setUp() {
        adminAvatarImageCommandService = new AdminAvatarImageCommandService(
                avatarImageRepository,
                imageUploadService
        );
    }

    @Test
    @DisplayName("기존 기본 아바타 이미지를 새 업로드 경로로 변경한다")
    void updateAvatarAssetChangesImageUrl() {
        // given
        AvatarImage asset = AvatarImage.create(Gender.MALE, "/old.png");
        given(avatarImageRepository.findByGender(Gender.MALE)).willReturn(Optional.of(asset));
        given(imageUploadService.upload(image, "avatars", "male")).willReturn("/new.png");
        given(avatarImageRepository.save(asset)).willReturn(asset);

        // when
        AdminAvatarImageResponse response =
                adminAvatarImageCommandService.updateAvatarAsset(Gender.MALE, image);

        // then
        assertThat(response.imageUrl()).isEqualTo("/new.png");
        then(imageUploadService).should().delete("/old.png");
    }

    @Test
    @DisplayName("등록되지 않은 성별의 기본 아바타 에셋을 최초 생성한다")
    void updateAvatarAssetCreatesMissingAsset() {
        // given
        given(avatarImageRepository.findByGender(Gender.FEMALE)).willReturn(Optional.empty());
        given(imageUploadService.upload(image, "avatars", "female")).willReturn("/female.png");
        given(avatarImageRepository.save(org.mockito.ArgumentMatchers.any()))
                .willAnswer(invocation -> invocation.getArgument(0));

        // when
        AdminAvatarImageResponse response =
                adminAvatarImageCommandService.updateAvatarAsset(Gender.FEMALE, image);

        // then
        assertThat(response.gender()).isEqualTo(Gender.FEMALE);
        assertThat(response.imageUrl()).isEqualTo("/female.png");
    }
}
