package com.wecandoit.admin.character.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import com.wecandoit.admin.character.controller.response.AdminCharacterImageResponse;
import com.wecandoit.character.domain.CharacterImage;
import com.wecandoit.character.repository.CharacterImageRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.member.domain.Gender;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("어드민 기본 캐릭터 에셋 조회 서비스")
class AdminCharacterImageReadServiceTest {

    @Mock
    private CharacterImageRepository characterImageRepository;
    private AdminCharacterImageReadService adminCharacterImageReadService;

    @BeforeEach
    void setUp() {
        adminCharacterImageReadService = new AdminCharacterImageReadService(characterImageRepository);
    }

    @Test
    @DisplayName("기본 캐릭터 에셋 목록을 성별 순서로 조회한다")
    void getCharacterAssetsReturnsAssets() {
        // given
        CharacterImage female = CharacterImage.create(Gender.FEMALE, "/female.png");
        CharacterImage male = CharacterImage.create(Gender.MALE, "/male.png");
        given(characterImageRepository.findAllByOrderByGenderAsc()).willReturn(List.of(female, male));

        // when
        List<AdminCharacterImageResponse> responses = adminCharacterImageReadService.getCharacterAssets();

        // then
        assertThat(responses)
                .extracting(AdminCharacterImageResponse::gender, AdminCharacterImageResponse::imageUrl)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(Gender.FEMALE, "/female.png"),
                        org.assertj.core.groups.Tuple.tuple(Gender.MALE, "/male.png")
                );
    }

    @Test
    @DisplayName("성별에 해당하는 기본 캐릭터 에셋이 없으면 실패한다")
    void getCharacterAssetRejectsMissingAsset() {
        // given
        given(characterImageRepository.findByGender(Gender.MALE)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> adminCharacterImageReadService.getCharacterAsset(Gender.MALE))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.DEFAULT_CHARACTER_ASSET_NOT_FOUND);
    }
}
