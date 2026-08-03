package com.wecandoit.item.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.item.service.AvatarItemCommandService;
import io.restassured.http.ContentType;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.BDDMockito;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.restdocs.RestDocumentationContextProvider;
import org.springframework.restdocs.RestDocumentationExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("아바타 아이템 API")
@ExtendWith({RestDocumentationExtension.class, MockitoExtension.class})
class AvatarItemControllerTest {

    @Mock
    private AvatarItemCommandService avatarItemCommandService;

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(
                        new AvatarItemController(avatarItemCommandService)
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
    @DisplayName("아바타 장착 상태를 일괄 저장하면 본문 없이 성공한다")
    void saveEquippedItemsReturnsNoContent() {
        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "memberItemIds": [10, 20]
                        }
                        """)
                .when()
                .put("/avatar-items")
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value())
                .apply(document("avatar-item-save-equipped-items",
                        requestFields(
                                fieldWithPath("memberItemIds")
                                        .description("장착 상태로 저장할 보유 아이템 ID 목록")
                        )
                ));
        BDDMockito.then(avatarItemCommandService).should().saveEquippedItems(1L, List.of(10L, 20L));
    }

    @Test
    @DisplayName("빈 목록을 요청하면 전체 장착 해제로 처리한다")
    void saveEquippedItemsAcceptsEmptyList() {
        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "memberItemIds": []
                        }
                        """)
                .when()
                .put("/avatar-items")
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value());
        BDDMockito.then(avatarItemCommandService).should().saveEquippedItems(1L, List.of());
    }

    @Test
    @DisplayName("보유 아이템 ID 목록이 없으면 잘못된 요청으로 처리한다")
    void saveEquippedItemsRejectsMissingMemberItemIds() {
        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("{}")
                .when()
                .put("/avatar-items")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .apply(document("avatar-item-save-equipped-items-invalid-request",
                        requestFields(),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
        BDDMockito.then(avatarItemCommandService)
                .should(never())
                .saveEquippedItems(Mockito.anyLong(), Mockito.any());
    }

    @Test
    @DisplayName("동일 카테고리가 중복되면 잘못된 요청으로 처리한다")
    void saveEquippedItemsRejectsDuplicateCategory() {
        // given
        willThrow(new CustomException(ErrorCode.DUPLICATE_ITEM_CATEGORY))
                .given(avatarItemCommandService)
                .saveEquippedItems(1L, List.of(10L, 20L));

        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "memberItemIds": [10, 20]
                        }
                        """)
                .when()
                .put("/avatar-items")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .apply(document("avatar-item-save-equipped-items-duplicate-category",
                        requestFields(
                                fieldWithPath("memberItemIds")
                                        .description("장착 상태로 저장할 보유 아이템 ID 목록")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
    }
}
