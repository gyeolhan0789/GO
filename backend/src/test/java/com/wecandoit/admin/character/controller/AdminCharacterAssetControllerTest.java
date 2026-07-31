package com.wecandoit.admin.character.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.BDDMockito.willReturn;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;

import com.wecandoit.admin.character.controller.response.AdminCharacterImageResponse;
import com.wecandoit.admin.character.service.AdminCharacterImageReadService;
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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.restdocs.RestDocumentationContextProvider;
import org.springframework.restdocs.RestDocumentationExtension;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("어드민 기본 캐릭터 에셋 API")
@ExtendWith({RestDocumentationExtension.class, MockitoExtension.class})
class AdminCharacterAssetControllerTest {

    @Mock
    private AdminCharacterImageReadService adminCharacterImageReadService;

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        RestAssuredMockMvc.mockMvc(MockMvcBuilders.standaloneSetup(
                        new AdminCharacterAssetController(adminCharacterImageReadService))
                .setControllerAdvice(new CustomExceptionHandler())
                .apply(documentationConfiguration(restDocumentation))
                .build());
    }

    @AfterEach
    void tearDown() {
        RestAssuredMockMvc.reset();
    }

    @Test
    @DisplayName("기본 캐릭터 에셋 목록을 조회하면 200 상태를 반환한다")
    void getCharacterAssetsReturnsOk() {
        // given
        willReturn(List.of(response(Gender.FEMALE, "/female.png"), response(Gender.MALE, "/male.png")))
                .given(adminCharacterImageReadService)
                .getCharacterAssets();

        // when & then
        given()
                .when()
                .get("/admin/character-assets")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("[0].gender", equalTo("FEMALE"))
                .body("[1].gender", equalTo("MALE"))
                .apply(document("admin-character-assets-get",
                        responseFields(
                                fieldWithPath("[].characterAssetId").description("기본 캐릭터 에셋 ID"),
                                fieldWithPath("[].gender").description("캐릭터 성별"),
                                fieldWithPath("[].imageUrl").description("기본 캐릭터 이미지 URL"),
                                fieldWithPath("[].updatedAt").description("마지막 변경 일시")
                        )
                ));
    }

    @Test
    @DisplayName("성별로 기본 캐릭터 에셋을 상세 조회한다")
    void getCharacterAssetReturnsOk() {
        // given
        willReturn(response(Gender.MALE, "/male.png"))
                .given(adminCharacterImageReadService)
                .getCharacterAsset(Gender.MALE);

        // when & then
        given()
                .when()
                .get("/admin/character-assets/{gender}", "MALE")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("gender", equalTo("MALE"))
                .body("imageUrl", equalTo("/male.png"))
                .apply(document("admin-character-asset-get",
                        pathParameters(parameterWithName("gender").description("캐릭터 성별(MALE/FEMALE)")),
                        responseFields(
                                fieldWithPath("characterAssetId").description("기본 캐릭터 에셋 ID"),
                                fieldWithPath("gender").description("캐릭터 성별"),
                                fieldWithPath("imageUrl").description("기본 캐릭터 이미지 URL"),
                                fieldWithPath("updatedAt").description("마지막 변경 일시")
                        )
                ));
    }

    private AdminCharacterImageResponse response(Gender gender, String imageUrl) {
        return new AdminCharacterImageResponse(
                gender == Gender.MALE ? 1L : 2L,
                gender,
                imageUrl,
                LocalDateTime.of(2026, 7, 29, 12, 0)
        );
    }
}
