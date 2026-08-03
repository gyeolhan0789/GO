package com.wecandoit.admin.avatar.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import com.wecandoit.admin.avatar.controller.response.AdminAvatarImageResponse;
import com.wecandoit.avatar.domain.AvatarImage;
import com.wecandoit.avatar.repository.AvatarImageRepository;
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
@DisplayName("어드민 기본 아바타 에셋 조회 서비스")
class AdminAvatarImageReadServiceTest {

    @Mock
    private AvatarImageRepository avatarImageRepository;
    private AdminAvatarImageReadService adminAvatarImageReadService;

    @BeforeEach
    void setUp() {
        adminAvatarImageReadService = new AdminAvatarImageReadService(avatarImageRepository);
    }

    @Test
    @DisplayName("기본 아바타 에셋 목록을 성별 순서로 조회한다")
    void getAvatarAssetsReturnsAssets() {
        // given
        AvatarImage female = AvatarImage.create(Gender.FEMALE, "/female.png");
        AvatarImage male = AvatarImage.create(Gender.MALE, "/male.png");
        given(avatarImageRepository.findAllByOrderByGenderAsc()).willReturn(List.of(female, male));

        // when
        List<AdminAvatarImageResponse> responses = adminAvatarImageReadService.getAvatarAssets();

        // then
        assertThat(responses)
                .extracting(AdminAvatarImageResponse::gender, AdminAvatarImageResponse::imageUrl)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(Gender.FEMALE, "/female.png"),
                        org.assertj.core.groups.Tuple.tuple(Gender.MALE, "/male.png")
                );
    }

    @Test
    @DisplayName("성별에 해당하는 기본 아바타 에셋이 없으면 실패한다")
    void getAvatarAssetRejectsMissingAsset() {
        // given
        given(avatarImageRepository.findByGender(Gender.MALE)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> adminAvatarImageReadService.getAvatarAsset(Gender.MALE))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.DEFAULT_AVATAR_ASSET_NOT_FOUND);
    }
}
