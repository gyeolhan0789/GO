package com.wecandoit.item.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.item.controller.response.ItemPurchaseResponse;
import com.wecandoit.item.controller.response.ShopItemResponse;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.service.ShopItemCommandService;
import com.wecandoit.item.service.ShopItemReadService;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.BDDMockito;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.restdocs.RestDocumentationContextProvider;
import org.springframework.restdocs.RestDocumentationExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("상점 아이템 목록 조회 API")
@ExtendWith({RestDocumentationExtension.class, MockitoExtension.class})
class ShopItemControllerTest {

    @Mock
    private ShopItemReadService shopItemReadService;
    @Mock
    private ShopItemCommandService shopItemCommandService;

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(
                        new ShopItemController(shopItemReadService, shopItemCommandService)
                )
                .setControllerAdvice(new CustomExceptionHandler())
                .setCustomArgumentResolvers(new LoginMemberIdArgumentResolver())
                .apply(documentationConfiguration(restDocumentation))
                .build();
        RestAssuredMockMvc.mockMvc(mockMvc);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        RestAssuredMockMvc.reset();
    }

    @Test
    @DisplayName("전체 상점 아이템 목록을 반환한다")
    void getShopItemsReturnsAllItems() {
        // given
        BDDMockito.given(shopItemReadService.getShopItems(null)).willReturn(List.of(
                new ShopItemResponse(
                        100L,
                        "빨간 모자",
                        ItemCategory.HAT,
                        1_000L,
                        "https://example.com/hat.png"
                ),
                new ShopItemResponse(
                        200L,
                        "파란 상의",
                        ItemCategory.TOP,
                        2_000L,
                        "https://example.com/top.png"
                )
        ));

        // when & then
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
        BDDMockito.then(shopItemReadService).should().getShopItems(null);
    }

    @Test
    @DisplayName("상점 아이템이 없으면 빈 배열을 반환한다")
    void getShopItemsReturnsEmptyList() {
        // given
        BDDMockito.given(shopItemReadService.getShopItems(null)).willReturn(List.of());

        // when & then
        given()
                .when()
                .get("/shop/items")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("$", hasSize(0));
        BDDMockito.then(shopItemReadService).should().getShopItems(null);
    }

    @Test
    @DisplayName("카테고리에 해당하는 상점 아이템 목록을 반환한다")
    void getShopItemsByCategoryReturnsMatchingItems() {
        // given
        BDDMockito.given(shopItemReadService.getShopItems("HAT")).willReturn(List.of(
                new ShopItemResponse(
                        100L,
                        "빨간 모자",
                        ItemCategory.HAT,
                        1_000L,
                        "https://example.com/hat.png"
                )
        ));

        // when & then
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
        BDDMockito.then(shopItemReadService).should().getShopItems("HAT");
    }

    @Test
    @DisplayName("카테고리에 해당하는 상점 아이템이 없으면 빈 배열을 반환한다")
    void getShopItemsByCategoryReturnsEmptyList() {
        // given
        BDDMockito.given(shopItemReadService.getShopItems("TOP")).willReturn(List.of());

        // when & then
        given()
                .queryParam("category", "TOP")
                .when()
                .get("/shop/items")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("$", hasSize(0));
        BDDMockito.then(shopItemReadService).should().getShopItems("TOP");
    }

    @Test
    @DisplayName("유효하지 않은 카테고리는 잘못된 요청으로 처리한다")
    void getShopItemsByCategoryRejectsInvalidCategory() {
        // given
        BDDMockito.given(shopItemReadService.getShopItems("UNKNOWN"))
                .willThrow(new CustomException(ErrorCode.INVALID_ITEM_CATEGORY));

        // when & then
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
        BDDMockito.then(shopItemReadService).should().getShopItems("UNKNOWN");
    }

    @Test
    @DisplayName("소문자 카테고리는 잘못된 요청으로 처리한다")
    void getShopItemsByCategoryRejectsLowercaseCategory() {
        // given
        BDDMockito.given(shopItemReadService.getShopItems("hat"))
                .willThrow(new CustomException(ErrorCode.INVALID_ITEM_CATEGORY));

        // when & then
        given()
                .queryParam("category", "hat")
                .when()
                .get("/shop/items")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        BDDMockito.then(shopItemReadService).should().getShopItems("hat");
    }

    @Test
    @DisplayName("아이템을 구매하면 생성된 보유 아이템과 남은 포인트를 반환한다")
    void purchaseItemReturnsCreatedMemberItem() {
        // given
        BDDMockito.given(shopItemCommandService.purchaseItem(1L, 100L))
                .willReturn(new ItemPurchaseResponse(15L, 100L, 4_000L));

        // when & then
        given()
                .when()
                .post("/shop/items/{itemId}/purchase", 100L)
                .then()
                .statusCode(HttpStatus.CREATED.value())
                .body("memberItemId", equalTo(15))
                .body("itemId", equalTo(100))
                .body("remainingPoint", equalTo(4_000))
                .apply(document("shop-item-purchase",
                        pathParameters(
                                parameterWithName("itemId").description("구매할 아이템 ID")
                        ),
                        responseFields(
                                fieldWithPath("memberItemId").description("생성된 보유 아이템 ID"),
                                fieldWithPath("itemId").description("구매한 아이템 ID"),
                                fieldWithPath("remainingPoint").description("구매 후 남은 포인트")
                        )
                ));
        BDDMockito.then(shopItemCommandService).should().purchaseItem(1L, 100L);
    }

    @Test
    @DisplayName("포인트가 부족하면 잘못된 요청으로 처리한다")
    void purchaseItemRejectsInsufficientPoint() {
        // given
        BDDMockito.given(shopItemCommandService.purchaseItem(1L, 100L))
                .willThrow(new CustomException(ErrorCode.INSUFFICIENT_POINT));

        // when & then
        given()
                .when()
                .post("/shop/items/{itemId}/purchase", 100L)
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .body("status", equalTo(HttpStatus.BAD_REQUEST.value()))
                .body("message", equalTo(ErrorCode.INSUFFICIENT_POINT.getMessage()))
                .apply(document("shop-item-purchase-insufficient-point",
                        pathParameters(
                                parameterWithName("itemId").description("구매할 아이템 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
        BDDMockito.then(shopItemCommandService).should().purchaseItem(1L, 100L);
    }

    @Test
    @DisplayName("이미 보유한 아이템을 구매하면 충돌로 처리한다")
    void purchaseItemRejectsAlreadyOwnedItem() {
        // given
        BDDMockito.given(shopItemCommandService.purchaseItem(1L, 100L))
                .willThrow(new CustomException(ErrorCode.ITEM_ALREADY_OWNED));

        // when & then
        given()
                .when()
                .post("/shop/items/{itemId}/purchase", 100L)
                .then()
                .statusCode(HttpStatus.CONFLICT.value())
                .body("status", equalTo(HttpStatus.CONFLICT.value()))
                .body("message", equalTo(ErrorCode.ITEM_ALREADY_OWNED.getMessage()));
        BDDMockito.then(shopItemCommandService).should().purchaseItem(1L, 100L);
    }
}
