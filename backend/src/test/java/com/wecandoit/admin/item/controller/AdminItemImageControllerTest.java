package com.wecandoit.admin.item.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willReturn;
import static org.mockito.Mockito.never;

import com.wecandoit.admin.item.controller.request.CreateAdminItemRequest;
import com.wecandoit.admin.item.controller.request.UpdateAdminItemRequest;
import com.wecandoit.admin.item.controller.response.AdminItemResponse;
import com.wecandoit.admin.item.service.AdminItemCommandService;
import com.wecandoit.common.exception.CustomExceptionHandler;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import java.time.LocalDateTime;
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

@DisplayName("어드민 아이템 이미지 등록/수정 API")
@ExtendWith(MockitoExtension.class)
class AdminItemImageControllerTest {

    @Mock
    private AdminItemCommandService adminItemCommandService;

    @BeforeEach
    void setUp() {
        RestAssuredMockMvc.mockMvc(MockMvcBuilders.standaloneSetup(
                        new AdminItemImageController(adminItemCommandService))
                .setControllerAdvice(new CustomExceptionHandler())
                .build());
    }

    @AfterEach
    void tearDown() {
        RestAssuredMockMvc.reset();
    }

    @Test
    @DisplayName("아이템과 이미지를 등록하면 201 상태를 반환한다")
    void createItemReturnsCreated() {
        // given
        willReturn(response(true)).given(adminItemCommandService).createItem(
                ArgumentMatchers.any(CreateAdminItemRequest.class),
                ArgumentMatchers.any(MultipartFile.class)
        );

        // when & then
        given()
                .formParam("name", "검은 모자")
                .formParam("category", "HAT")
                .formParam("price", "1000")
                .multiPart("image", "hat.png", "png-bytes".getBytes(), "image/png")
                .when()
                .post("/admin/items")
                .then()
                .statusCode(HttpStatus.CREATED.value())
                .body("itemId", equalTo(1));
    }

    @Test
    @DisplayName("아이템 정보를 수정하면 변경 결과를 반환한다")
    void updateItemReturnsOk() {
        // given
        willReturn(response(true)).given(adminItemCommandService).updateItem(
                ArgumentMatchers.eq(1L),
                ArgumentMatchers.any(UpdateAdminItemRequest.class),
                ArgumentMatchers.isNull()
        );

        // when & then
        given()
                .formParam("name", "새 모자")
                .formParam("category", "HAT")
                .formParam("price", "2000")
                .formParam("availableForSale", "true")
                .multiPart("placeholder", "value")
                .when()
                .put("/admin/items/{itemId}", 1)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("availableForSale", equalTo(true));
    }

    @Test
    @DisplayName("음수 가격으로 아이템을 등록하면 요청을 거절한다")
    void createItemRejectsNegativePrice() {
        // when & then
        given()
                .formParam("name", "검은 모자")
                .formParam("category", "HAT")
                .formParam("price", "-1")
                .multiPart("image", "hat.png", "png-bytes".getBytes(), "image/png")
                .when()
                .post("/admin/items")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        then(adminItemCommandService).should(never()).createItem(
                ArgumentMatchers.any(),
                ArgumentMatchers.any()
        );
    }

    @Test
    @DisplayName("이미지 없이 아이템을 등록하면 요청을 거절한다")
    void createItemRejectsMissingImage() {
        // when & then
        given()
                .formParam("name", "검은 모자")
                .formParam("category", "HAT")
                .formParam("price", "1000")
                .multiPart("placeholder", "value")
                .when()
                .post("/admin/items")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        then(adminItemCommandService).should(never()).createItem(
                ArgumentMatchers.any(),
                ArgumentMatchers.any()
        );
    }

    private AdminItemResponse response(boolean availableForSale) {
        return new AdminItemResponse(
                1L,
                "검은 모자",
                "HAT",
                1_000L,
                "/uploads/test/items/1/hat.png",
                availableForSale,
                LocalDateTime.of(2026, 7, 29, 12, 0)
        );
    }
}
