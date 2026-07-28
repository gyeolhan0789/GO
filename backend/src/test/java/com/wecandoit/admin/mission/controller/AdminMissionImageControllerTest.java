package com.wecandoit.admin.mission.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.storage.ImageUploadService;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.multipart.MultipartFile;

@DisplayName("어드민 미션 이미지 업로드 API")
@ExtendWith(MockitoExtension.class)
class AdminMissionImageControllerTest {

    @Mock
    private ImageUploadService imageUploadService;

    @BeforeEach
    void setUp() {
        RestAssuredMockMvc.mockMvc(MockMvcBuilders.standaloneSetup(
                        new AdminMissionImageController(imageUploadService))
                .setControllerAdvice(new CustomExceptionHandler())
                .build());
    }

    @AfterEach
    void tearDown() {
        RestAssuredMockMvc.reset();
    }

    @Test
    @DisplayName("이미지를 업로드하면 201 상태와 이미지 URL을 반환한다")
    void uploadMissionImageReturnsCreated() {
        // given
        given(imageUploadService.upload(
                ArgumentMatchers.any(MultipartFile.class),
                ArgumentMatchers.eq("missions"),
                ArgumentMatchers.anyString()))
                .willReturn("/uploads/test/missions/resource-1/uuid.png");

        // when & then
        given()
                .multiPart("image", "flower.png", "png-bytes".getBytes(), "image/png")
                .when()
                .post("/admin/missions/images")
                .then()
                .statusCode(HttpStatus.CREATED.value())
                .body("imageUrl", org.hamcrest.Matchers.is("/uploads/test/missions/resource-1/uuid.png"));
    }

    @Test
    @DisplayName("허용되지 않는 이미지 형식이면 400 상태를 반환한다")
    void uploadMissionImageRejectsInvalidType() {
        // given
        willThrow(new CustomException(ErrorCode.INVALID_IMAGE_TYPE))
                .given(imageUploadService)
                .upload(ArgumentMatchers.any(MultipartFile.class), ArgumentMatchers.anyString(),
                        ArgumentMatchers.anyString());

        // when & then
        given()
                .multiPart("image", "doc.pdf", "pdf-bytes".getBytes(), "application/pdf")
                .when()
                .post("/admin/missions/images")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
    }

    @Test
    @DisplayName("파일 크기가 너무 크면 400 상태를 반환한다")
    void uploadMissionImageRejectsOversizedFile() {
        // given
        willThrow(new CustomException(ErrorCode.IMAGE_TOO_LARGE))
                .given(imageUploadService)
                .upload(ArgumentMatchers.any(MultipartFile.class), ArgumentMatchers.anyString(),
                        ArgumentMatchers.anyString());

        // when & then
        given()
                .multiPart("image", "flower.png", "png-bytes".getBytes(), "image/png")
                .when()
                .post("/admin/missions/images")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
    }
}
