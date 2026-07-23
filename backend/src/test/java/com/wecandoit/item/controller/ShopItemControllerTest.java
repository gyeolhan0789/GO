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
        when(shopItemQueryService.getShopItems()).thenReturn(List.of(
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
                        responseFields(
                                fieldWithPath("[].itemId").description("아이템 ID"),
                                fieldWithPath("[].name").description("아이템 이름"),
                                fieldWithPath("[].category").description("아이템 카테고리"),
                                fieldWithPath("[].price").description("아이템 가격"),
                                fieldWithPath("[].imageUrl").description("아이템 이미지 URL")
                        )
                ));
        verify(shopItemQueryService).getShopItems();
    }

    @Test
    @DisplayName("상점 아이템이 없으면 빈 배열을 반환한다")
    void getShopItemsReturnsEmptyList() {
        // given
        when(shopItemQueryService.getShopItems()).thenReturn(List.of());

        // when, then
        given()
                .when()
                .get("/shop/items")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("$", hasSize(0));
        verify(shopItemQueryService).getShopItems();
    }
}
