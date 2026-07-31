package com.wecandoit.admin.item.controller;

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

import com.wecandoit.admin.item.controller.response.AdminItemResponse;
import com.wecandoit.admin.item.service.AdminItemCommandService;
import com.wecandoit.admin.item.service.AdminItemReadService;
import com.wecandoit.common.exception.CustomExceptionHandler;
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

@DisplayName("어드민 아이템 API")
@ExtendWith({RestDocumentationExtension.class, MockitoExtension.class})
class AdminItemControllerTest {

    @Mock
    private AdminItemCommandService adminItemCommandService;
    @Mock
    private AdminItemReadService adminItemReadService;

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        RestAssuredMockMvc.mockMvc(MockMvcBuilders.standaloneSetup(
                        new AdminItemController(adminItemCommandService, adminItemReadService))
                .setControllerAdvice(new CustomExceptionHandler())
                .apply(documentationConfiguration(restDocumentation))
                .build());
    }

    @AfterEach
    void tearDown() {
        RestAssuredMockMvc.reset();
    }

    @Test
    @DisplayName("전체 아이템 목록을 조회한다")
    void getItemsReturnsOk() {
        // given
        willReturn(List.of(response(true))).given(adminItemReadService).getItems();

        // when & then
        given()
                .when()
                .get("/admin/items")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("[0].itemId", equalTo(1))
                .body("[0].availableForSale", equalTo(true))
                .apply(document("admin-items-get",
                        responseFields(
                                fieldWithPath("[].itemId").description("아이템 ID"),
                                fieldWithPath("[].name").description("아이템 이름"),
                                fieldWithPath("[].category").description("아이템 카테고리"),
                                fieldWithPath("[].price").description("아이템 가격"),
                                fieldWithPath("[].imageUrl").description("아이템 이미지 URL"),
                                fieldWithPath("[].availableForSale").description("판매 가능 여부"),
                                fieldWithPath("[].updatedAt").description("마지막 수정 일시")
                        )
                ));
    }

    @Test
    @DisplayName("아이템을 상세 조회한다")
    void getItemReturnsOk() {
        // given
        willReturn(response(true)).given(adminItemReadService).getItem(1L);

        // when & then
        given()
                .when()
                .get("/admin/items/{itemId}", 1)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("itemId", equalTo(1))
                .apply(document("admin-item-get",
                        pathParameters(parameterWithName("itemId").description("아이템 ID")),
                        responseFields(
                                fieldWithPath("itemId").description("아이템 ID"),
                                fieldWithPath("name").description("아이템 이름"),
                                fieldWithPath("category").description("아이템 카테고리"),
                                fieldWithPath("price").description("아이템 가격"),
                                fieldWithPath("imageUrl").description("아이템 이미지 URL"),
                                fieldWithPath("availableForSale").description("판매 가능 여부"),
                                fieldWithPath("updatedAt").description("마지막 수정 일시")
                        )
                ));
    }

    @Test
    @DisplayName("아이템 삭제 요청은 본문 없이 판매를 중지한다")
    void stopItemSaleReturnsNoContent() {
        // when & then
        given()
                .when()
                .delete("/admin/items/{itemId}", 1)
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value());
        then(adminItemCommandService).should().stopItemSale(1L);
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
