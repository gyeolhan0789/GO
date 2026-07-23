package com.wecandoit.item.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.item.controller.response.ShopItemResponse;
import com.wecandoit.item.service.ShopItemQueryService;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.restdocs.RestDocumentationContextProvider;
import org.springframework.restdocs.RestDocumentationExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("상점 아이템 목록 조회 API")
@ExtendWith(RestDocumentationExtension.class)
class ShopItemControllerTest {

    private final ShopItemQueryService shopItemQueryService = Mockito.mock(ShopItemQueryService.class);

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new ShopItemController(shopItemQueryService))
                .setControllerAdvice(new CustomExceptionHandler())
                .apply(documentationConfiguration(restDocumentation))
                .build();
        RestAssuredMockMvc.mockMvc(mockMvc);
    }

    @AfterEach
    void tearDown() {
        RestAssuredMockMvc.reset();
    }

    @Test
    @DisplayName("전체 상점 아이템 목록을 반환한다")
    void getShopItemsReturnsAllItems() {
        // given
        when(shopItemQueryService.getShopItems(null)).thenReturn(List.of(
                new ShopItemResponse(
                        100L,
                        "빨간 모자",
                        "HAT",
                        1_000L,
                        "https://example.com/hat.png"
                ),
                new ShopItemResponse(
                        200L,
                        "파란 상의",
                        "TOP",
                        2_000L,
                        "https://example.com/top.png"
                )
        ));

        // when, then
        given()
                .when()
                .get("/shop/items")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("$", hasSize(2))
                .body("[0].itemId", equalTo(100))
                .body("[0].name", equalTo("빨간 모자"))
                .body("[0].category", equalTo("HAT"))
                .body("[0].price", equalTo(1_000))
                .body("[0].imageUrl", equalTo("https://example.com/hat.png"))
                .body("[1].itemId", equalTo(200))
                .body("[1].name", equalTo("파란 상의"))
                .body("[1].category", equalTo("TOP"))
                .body("[1].price", equalTo(2_000))
                .body("[1].imageUrl", equalTo("https://example.com/top.png"))
                .apply(document("shop-item-list-get",
                        queryParameters(
                                parameterWithName("category").description("아이템 카테고리").optional()
                        ),
                        responseFields(
                                fieldWithPath("[].itemId").description("아이템 ID"),
                                fieldWithPath("[].name").description("아이템 이름"),
                                fieldWithPath("[].category").description("아이템 카테고리"),
                                fieldWithPath("[].price").description("아이템 가격"),
                                fieldWithPath("[].imageUrl").description("아이템 이미지 URL")
                        )
                ));
        verify(shopItemQueryService).getShopItems(null);
    }

    @Test
    @DisplayName("상점 아이템이 없으면 빈 배열을 반환한다")
    void getShopItemsReturnsEmptyList() {
        // given
        when(shopItemQueryService.getShopItems(null)).thenReturn(List.of());

        // when, then
        given()
                .when()
                .get("/shop/items")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("$", hasSize(0));
        verify(shopItemQueryService).getShopItems(null);
    }

    @Test
    @DisplayName("카테고리에 해당하는 상점 아이템 목록을 반환한다")
    void getShopItemsByCategoryReturnsMatchingItems() {
        // given
        when(shopItemQueryService.getShopItems("HAT")).thenReturn(List.of(
                new ShopItemResponse(
                        100L,
                        "빨간 모자",
                        "HAT",
                        1_000L,
                        "https://example.com/hat.png"
                )
        ));

        // when, then
        given()
                .queryParam("category", "HAT")
                .when()
                .get("/shop/items")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("$", hasSize(1))
                .body("[0].itemId", equalTo(100))
                .body("[0].name", equalTo("빨간 모자"))
                .body("[0].category", equalTo("HAT"))
                .body("[0].price", equalTo(1_000))
                .body("[0].imageUrl", equalTo("https://example.com/hat.png"))
                .apply(document("shop-item-list-get-by-category",
                        queryParameters(
                                parameterWithName("category").description("아이템 카테고리").optional()
                        ),
                        responseFields(
                                fieldWithPath("[].itemId").description("아이템 ID"),
                                fieldWithPath("[].name").description("아이템 이름"),
                                fieldWithPath("[].category").description("아이템 카테고리"),
                                fieldWithPath("[].price").description("아이템 가격"),
                                fieldWithPath("[].imageUrl").description("아이템 이미지 URL")
                        )
                ));
        verify(shopItemQueryService).getShopItems("HAT");
    }

    @Test
    @DisplayName("카테고리에 해당하는 상점 아이템이 없으면 빈 배열을 반환한다")
    void getShopItemsByCategoryReturnsEmptyList() {
        // given
        when(shopItemQueryService.getShopItems("TOP")).thenReturn(List.of());

        // when, then
        given()
                .queryParam("category", "TOP")
                .when()
                .get("/shop/items")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("$", hasSize(0));
        verify(shopItemQueryService).getShopItems("TOP");
    }

    @Test
    @DisplayName("유효하지 않은 카테고리는 잘못된 요청으로 처리한다")
    void getShopItemsByCategoryRejectsInvalidCategory() {
        // given
        when(shopItemQueryService.getShopItems("UNKNOWN"))
                .thenThrow(new CustomException(ErrorCode.INVALID_ITEM_CATEGORY));

        // when, then
        given()
                .queryParam("category", "UNKNOWN")
                .when()
                .get("/shop/items")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .body("status", equalTo(HttpStatus.BAD_REQUEST.value()))
                .body("message", equalTo(ErrorCode.INVALID_ITEM_CATEGORY.getMessage()))
                .apply(document("shop-item-list-get-invalid-category",
                        queryParameters(
                                parameterWithName("category").description("유효하지 않은 아이템 카테고리")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
        verify(shopItemQueryService).getShopItems("UNKNOWN");
    }

    @Test
    @DisplayName("소문자 카테고리는 잘못된 요청으로 처리한다")
    void getShopItemsByCategoryRejectsLowercaseCategory() {
        // given
        when(shopItemQueryService.getShopItems("hat"))
                .thenThrow(new CustomException(ErrorCode.INVALID_ITEM_CATEGORY));

        // when, then
        given()
                .queryParam("category", "hat")
                .when()
                .get("/shop/items")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        verify(shopItemQueryService).getShopItems("hat");
    }
}
