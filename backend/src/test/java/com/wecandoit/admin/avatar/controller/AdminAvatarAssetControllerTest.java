package com.wecandoit.admin.avatar.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willReturn;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;

import com.wecandoit.admin.avatar.controller.response.AdminAvatarImageResponse;
import com.wecandoit.admin.avatar.service.AdminAvatarImageCommandService;
import com.wecandoit.admin.avatar.service.AdminAvatarImageReadService;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.member.domain.Gender;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.restdocs.RestDocumentationContextProvider;
import org.springframework.restdocs.RestDocumentationExtension;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.multipart.MultipartFile;

@DisplayName("어드민 기본 아바타 에셋 API")
@ExtendWith({RestDocumentationExtension.class, MockitoExtension.class})
class AdminAvatarAssetControllerTest {

    @Mock
    private AdminAvatarImageReadService adminAvatarImageReadService;

    @Mock
    private AdminAvatarImageCommandService adminAvatarImageCommandService;

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        RestAssuredMockMvc.mockMvc(MockMvcBuilders.standaloneSetup(
                        new AdminAvatarAssetController(adminAvatarImageReadService, adminAvatarImageCommandService))
                .setControllerAdvice(new CustomExceptionHandler())
                .apply(documentationConfiguration(restDocumentation))
                .build());
    }

    @AfterEach
    void tearDown() {
        RestAssuredMockMvc.reset();
    }

    @Test
    @DisplayName("기본 아바타 에셋 목록을 조회하면 200 상태를 반환한다")
    void getAvatarAssetsReturnsOk() {
        // given
        willReturn(List.of(response(Gender.FEMALE, "/female.png"), response(Gender.MALE, "/male.png")))
                .given(adminAvatarImageReadService)
                .getAvatarAssets();

        // when & then
        given()
                .when()
                .get("/admin/avatar-assets")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("[0].gender", equalTo("FEMALE"))
                .body("[1].gender", equalTo("MALE"))
                .apply(document("admin-avatar-assets-get",
                        responseFields(
                                fieldWithPath("[].avatarAssetId").description("기본 아바타 에셋 ID"),
                                fieldWithPath("[].gender").description("아바타 성별"),
                                fieldWithPath("[].imageUrl").description("기본 아바타 이미지 URL"),
                                fieldWithPath("[].updatedAt").description("마지막 변경 일시")
                        )
                ));
    }

    @Test
    @DisplayName("성별로 기본 아바타 에셋을 상세 조회한다")
    void getAvatarAssetReturnsOk() {
        // given
        willReturn(response(Gender.MALE, "/male.png"))
                .given(adminAvatarImageReadService)
                .getAvatarAsset(Gender.MALE);

        // when & then
        given()
                .when()
                .get("/admin/avatar-assets/{gender}", "MALE")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("gender", equalTo("MALE"))
                .body("imageUrl", equalTo("/male.png"))
                .apply(document("admin-avatar-asset-get",
                        pathParameters(parameterWithName("gender").description("아바타 성별(MALE/FEMALE)")),
                        responseFields(
                                fieldWithPath("avatarAssetId").description("기본 아바타 에셋 ID"),
                                fieldWithPath("gender").description("아바타 성별"),
                                fieldWithPath("imageUrl").description("기본 아바타 이미지 URL"),
                                fieldWithPath("updatedAt").description("마지막 변경 일시")
                        )
                ));
    }

    @Test
    @DisplayName("기본 아바타 이미지를 변경하면 변경 결과를 반환한다")
    void updateAvatarAssetReturnsOk() {
        // given
        willReturn(response(Gender.MALE, "/new-male.png"))
                .given(adminAvatarImageCommandService)
                .updateAvatarAsset(
                        ArgumentMatchers.eq(Gender.MALE),
                        ArgumentMatchers.any(MultipartFile.class)
                );

        // when & then
        given()
                .multiPart("image", "male.png", "png-bytes".getBytes(), "image/png")
                .when()
                .put("/admin/avatar-assets/{gender}", "MALE")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("imageUrl", equalTo("/new-male.png"))
                .apply(document("admin-avatar-asset-update",
                        pathParameters(parameterWithName("gender").description("아바타 성별(MALE/FEMALE)")),
                        responseFields(
                                fieldWithPath("avatarAssetId").description("기본 아바타 에셋 ID"),
                                fieldWithPath("gender").description("아바타 성별"),
                                fieldWithPath("imageUrl").description("변경된 기본 아바타 이미지 URL"),
                                fieldWithPath("updatedAt").description("마지막 변경 일시")
                        )
                ));
        then(adminAvatarImageCommandService).should().updateAvatarAsset(
                ArgumentMatchers.eq(Gender.MALE),
                ArgumentMatchers.any(MultipartFile.class)
        );
    }

    private AdminAvatarImageResponse response(Gender gender, String imageUrl) {
        return new AdminAvatarImageResponse(
                gender == Gender.MALE ? 1L : 2L,
                gender,
                imageUrl,
                LocalDateTime.of(2026, 7, 29, 12, 0)
        );
    }
}
