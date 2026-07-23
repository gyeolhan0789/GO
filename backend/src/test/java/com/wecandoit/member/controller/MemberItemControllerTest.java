package com.wecandoit.member.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
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
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.item.controller.response.MemberItemResponse;
import com.wecandoit.item.service.CharacterItemReadService;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("보유 아이템 목록 조회 API")
@ExtendWith(RestDocumentationExtension.class)
class MemberItemControllerTest {

    private final CharacterItemReadService characterItemReadService = Mockito.mock(
            CharacterItemReadService.class
    );

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(
                        new MemberItemController(characterItemReadService)
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
    @DisplayName("전체 보유 아이템 목록을 반환한다")
    void getMyItemsReturnsMemberItems() {
        // given
        when(characterItemReadService.getMyItems(1L, null)).thenReturn(List.of(
                new MemberItemResponse(
                        10L,
                        100L,
                        "빨간 모자",
                        "HAT",
                        "https://example.com/hat.png"
                )
        ));

        // when, then
        given()
                .when()
                .get("/members/items")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("$", hasSize(1))
                .body("[0].memberItemId", equalTo(10))
                .body("[0].itemId", equalTo(100))
                .body("[0].name", equalTo("빨간 모자"))
                .body("[0].category", equalTo("HAT"))
                .body("[0].imageUrl", equalTo("https://example.com/hat.png"))
                .apply(document("member-item-list-get",
                        responseFields(
                                fieldWithPath("[].memberItemId").description("보유 아이템 ID"),
                                fieldWithPath("[].itemId").description("원본 아이템 ID"),
                                fieldWithPath("[].name").description("아이템 이름"),
                                fieldWithPath("[].category").description("아이템 카테고리"),
                                fieldWithPath("[].imageUrl").description("아이템 이미지 URL")
                        )
                ));
        verify(characterItemReadService).getMyItems(1L, null);
    }

    @Test
    @DisplayName("카테고리에 해당하는 보유 아이템 목록을 반환한다")
    void getMyItemsByCategoryReturnsMemberItems() {
        // given
        when(characterItemReadService.getMyItems(1L, "HAT")).thenReturn(List.of(
                new MemberItemResponse(
                        10L,
                        100L,
                        "빨간 모자",
                        "HAT",
                        "https://example.com/hat.png"
                )
        ));

        // when, then
        given()
                .queryParam("category", "HAT")
                .when()
                .get("/members/items")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("$", hasSize(1))
                .body("[0].category", equalTo("HAT"))
                .apply(document("member-item-list-get-by-category",
                        queryParameters(
                                parameterWithName("category").description("아이템 카테고리")
                        ),
                        responseFields(
                                fieldWithPath("[].memberItemId").description("보유 아이템 ID"),
                                fieldWithPath("[].itemId").description("원본 아이템 ID"),
                                fieldWithPath("[].name").description("아이템 이름"),
                                fieldWithPath("[].category").description("아이템 카테고리"),
                                fieldWithPath("[].imageUrl").description("아이템 이미지 URL")
                        )
                ));
        verify(characterItemReadService).getMyItems(1L, "HAT");
    }

    @Test
    @DisplayName("카테고리에 해당하는 보유 아이템이 없으면 빈 목록을 반환한다")
    void getMyItemsByCategoryReturnsEmptyList() {
        // given
        when(characterItemReadService.getMyItems(1L, "TOP")).thenReturn(List.of());

        // when, then
        given()
                .queryParam("category", "TOP")
                .when()
                .get("/members/items")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("$", hasSize(0));
        verify(characterItemReadService).getMyItems(1L, "TOP");
    }

    @Test
    @DisplayName("유효하지 않은 카테고리는 잘못된 요청으로 처리한다")
    void getMyItemsByCategoryRejectsInvalidCategory() {
        // given
        doThrow(new CustomException(ErrorCode.INVALID_ITEM_CATEGORY))
                .when(characterItemReadService)
                .getMyItems(1L, "UNKNOWN");

        // when, then
        given()
                .queryParam("category", "UNKNOWN")
                .when()
                .get("/members/items")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .apply(document("member-item-list-get-invalid-category",
                        queryParameters(
                                parameterWithName("category").description("유효하지 않은 아이템 카테고리")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
        verify(characterItemReadService).getMyItems(1L, "UNKNOWN");
    }

    @Test
    @DisplayName("소문자 카테고리는 잘못된 요청으로 처리한다")
    void getMyItemsByCategoryRejectsLowercaseCategory() {
        // given
        doThrow(new CustomException(ErrorCode.INVALID_ITEM_CATEGORY))
                .when(characterItemReadService)
                .getMyItems(1L, "hat");

        // when, then
        given()
                .queryParam("category", "hat")
                .when()
                .get("/members/items")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        verify(characterItemReadService).getMyItems(1L, "hat");
        verify(characterItemReadService, never()).getMyItems(1L);
    }
}
