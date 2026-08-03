package com.wecandoit.point.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;

import com.wecandoit.point.controller.response.PointHistoryResponse;
import com.wecandoit.point.domain.PointHistoryType;
import com.wecandoit.point.service.PointHistoryReadService;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.BDDMockito;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.restdocs.RestDocumentationContextProvider;
import org.springframework.restdocs.RestDocumentationExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith({RestDocumentationExtension.class, MockitoExtension.class})
@DisplayName("포인트 이력 API")
class PointHistoryControllerTest {

    @Mock
    private PointHistoryReadService pointHistoryReadService;

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new PointHistoryController(pointHistoryReadService))
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
    @DisplayName("인증 회원의 포인트 이력 목록을 반환한다")
    void returnsTheAuthenticatedMembersPointHistories() {
        BDDMockito.given(pointHistoryReadService.getPointHistories(1L)).willReturn(List.of(
                new PointHistoryResponse(1L, PointHistoryType.GAME_GOAL_REWARD, 200L,
                        LocalDateTime.of(2026, 7, 24, 12, 0), 10L, 100L, null, null, null, null),
                new PointHistoryResponse(2L, PointHistoryType.ITEM_PURCHASE, -1_000L,
                        LocalDateTime.of(2026, 7, 24, 11, 0), null, null, null, null, 20L, "Red Hat")
        ));

        given()
                .when()
                .get("/members/point-histories")
                .then()
                .statusCode(200)
                .body("$", hasSize(2))
                .body("[0].amount", equalTo(200))
                .body("[0].roomId", equalTo(10))
                .body("[0].gameId", equalTo(100))
                .body("[1].amount", equalTo(-1_000))
                .body("[1].itemId", equalTo(20))
                .body("[1].itemName", equalTo("Red Hat"))
                .apply(document("point-history-get",
                        responseFields(
                                fieldWithPath("[].pointHistoryId").description("포인트 내역 ID"),
                                fieldWithPath("[].type").description("거래 유형"),
                                fieldWithPath("[].amount").description("증감 포인트 금액"),
                                fieldWithPath("[].occurredAt").description("발생 시각"),
                                fieldWithPath("[].roomId").description("보상 대상 방 ID").optional(),
                                fieldWithPath("[].gameId").description("보상 대상 게임 회차 ID").optional(),
                                fieldWithPath("[].bingoCellId").description("빙고 칸 보상 대상 칸 ID").optional(),
                                fieldWithPath("[].bingoBoardId").description("공동 걸음 목표 보상 대상 빙고판 ID").optional(),
                                fieldWithPath("[].itemId").description("구매 아이템 ID").optional(),
                                fieldWithPath("[].itemName").description("구매 아이템 이름").optional()
                        )
                ));
        BDDMockito.then(pointHistoryReadService).should().getPointHistories(1L);
    }
}
