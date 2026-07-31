package com.wecandoit.admin.character.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.admin.character.controller.response.AdminCharacterImageResponse;
import com.wecandoit.character.domain.CharacterImage;
import com.wecandoit.character.repository.CharacterImageRepository;
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
@DisplayName("어드민 기본 캐릭터 에셋 변경 서비스")
class AdminCharacterImageCommandServiceTest {

    @Mock
    private CharacterImageRepository characterImageRepository;
    @Mock
    private ImageUploadService imageUploadService;
    @Mock
    private MultipartFile image;
    private AdminCharacterImageCommandService adminCharacterImageCommandService;

    @BeforeEach
    void setUp() {
        adminCharacterImageCommandService = new AdminCharacterImageCommandService(
                characterImageRepository,
                imageUploadService
        );
    }

    @Test
    @DisplayName("기존 기본 캐릭터 이미지를 새 업로드 경로로 변경한다")
    void updateCharacterAssetChangesImageUrl() {
        // given
        CharacterImage asset = CharacterImage.create(Gender.MALE, "/old.png");
        given(characterImageRepository.findByGender(Gender.MALE)).willReturn(Optional.of(asset));
        given(imageUploadService.upload(image, "characters", "male")).willReturn("/new.png");
        given(characterImageRepository.save(asset)).willReturn(asset);

        // when
        AdminCharacterImageResponse response =
                adminCharacterImageCommandService.updateCharacterAsset(Gender.MALE, image);

        // then
        assertThat(response.imageUrl()).isEqualTo("/new.png");
        then(imageUploadService).should().delete("/old.png");
    }

    @Test
    @DisplayName("등록되지 않은 성별의 기본 캐릭터 에셋을 최초 생성한다")
    void updateCharacterAssetCreatesMissingAsset() {
        // given
        given(characterImageRepository.findByGender(Gender.FEMALE)).willReturn(Optional.empty());
        given(imageUploadService.upload(image, "characters", "female")).willReturn("/female.png");
        given(characterImageRepository.save(org.mockito.ArgumentMatchers.any()))
                .willAnswer(invocation -> invocation.getArgument(0));

        // when
        AdminCharacterImageResponse response =
                adminCharacterImageCommandService.updateCharacterAsset(Gender.FEMALE, image);

        // then
        assertThat(response.gender()).isEqualTo(Gender.FEMALE);
        assertThat(response.imageUrl()).isEqualTo("/female.png");
    }
}
