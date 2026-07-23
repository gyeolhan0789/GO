package com.wecandoit.history.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.history.controller.request.HistorySaveRequest;
import com.wecandoit.history.controller.response.HistoryDateResponse;
import com.wecandoit.history.controller.response.HistoryResponse;
import com.wecandoit.history.domain.HistoryPeriod;
import com.wecandoit.history.service.HistoryCommandService;
import com.wecandoit.history.service.HistoryReadService;
import io.restassured.http.ContentType;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.restdocs.RestDocumentationContextProvider;
import org.springframework.restdocs.RestDocumentationExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("히스토리 API")
@ExtendWith(RestDocumentationExtension.class)
class HistoryControllerTest {

    private final HistoryCommandService historyCommandService = Mockito.mock(HistoryCommandService.class);
    private final HistoryReadService historyReadService = Mockito.mock(HistoryReadService.class);

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new HistoryController(
                        historyCommandService,
                        historyReadService
                ))
                .setControllerAdvice(new CustomExceptionHandler())
                .setCustomArgumentResolvers(new LoginMemberIdArgumentResolver())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(
                        Jackson2ObjectMapperBuilder.json()
                                .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                                .build()
                ))
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
    @DisplayName("히스토리를 조회하면 기간별 히스토리를 반환한다")
    void getHistoriesReturnsHistories() {
        // given
        LocalDate date = LocalDate.of(2026, 7, 23);
        HistoryResponse response = HistoryResponse.from(
                HistoryPeriod.WEEK,
                LocalDate.of(2026, 7, 20),
                LocalDate.of(2026, 7, 26),
                List.of(
                        new HistoryDateResponse(LocalDate.of(2026, 7, 20), 1_000, 700, 50),
                        HistoryDateResponse.empty(LocalDate.of(2026, 7, 21))
                )
        );
        Mockito.when(historyReadService.getHistories(1L, HistoryPeriod.WEEK, date)).thenReturn(response);

        // when, then
        given()
                .queryParam("period", "WEEK")
                .queryParam("date", "2026-07-23")
                .when()
                .get("/histories")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("period", equalTo("WEEK"))
                .body("startDate", equalTo("2026-07-20"))
                .body("endDate", equalTo("2026-07-26"))
                .body("totalStep", equalTo(1_000))
                .body("totalDistance", equalTo(700))
                .body("totalCalories", equalTo(50))
                .body("histories[0].historyDate", equalTo("2026-07-20"))
                .body("histories[0].step", equalTo(1_000))
                .body("histories[0].distance", equalTo(700))
                .body("histories[0].calories", equalTo(50))
                .body("histories[1].historyDate", equalTo("2026-07-21"))
                .body("histories[1].step", equalTo(0))
                .body("histories[1].distance", equalTo(0))
                .body("histories[1].calories", equalTo(0))
                .apply(document("history-list",
                        queryParameters(
                                parameterWithName("period").description("조회 기간 타입(DAY, WEEK, MONTH)"),
                                parameterWithName("date").description("조회 기준 날짜(ISO-8601 yyyy-MM-dd)")
                        ),
                        responseFields(
                                fieldWithPath("period").description("조회 기간 타입"),
                                fieldWithPath("startDate").description("조회 시작 날짜"),
                                fieldWithPath("endDate").description("조회 종료 날짜"),
                                fieldWithPath("totalStep").description("기간 내 총 걸음 수"),
                                fieldWithPath("totalDistance").description("기간 내 총 거리"),
                                fieldWithPath("totalCalories").description("기간 내 총 칼로리"),
                                fieldWithPath("histories[].historyDate").description("히스토리 날짜"),
                                fieldWithPath("histories[].step").description("걸음 수"),
                                fieldWithPath("histories[].distance").description("거리"),
                                fieldWithPath("histories[].calories").description("칼로리")
                        )
                ));
        verify(historyReadService).getHistories(1L, HistoryPeriod.WEEK, date);
    }

    @Test
    @DisplayName("히스토리를 저장하면 201 상태를 반환한다")
    void saveHistoryReturnsCreated() {
        // given
        HistorySaveRequest request = new HistorySaveRequest(
                LocalDate.of(2026, 7, 23),
                1_000,
                700,
                50
        );

        // when, then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "historyDate": "2026-07-23",
                          "step": 1000,
                          "distance": 700,
                          "calories": 50
                        }
                        """)
                .when()
                .post("/histories")
                .then()
                .statusCode(HttpStatus.CREATED.value())
                .apply(document("history-save",
                        requestFields(
                                fieldWithPath("historyDate").description("히스토리 날짜(ISO-8601 yyyy-MM-dd)"),
                                fieldWithPath("step").description("걸음 수"),
                                fieldWithPath("distance").description("거리"),
                                fieldWithPath("calories").description("칼로리")
                        )
                ));
        verify(historyCommandService).saveHistory(1L, request);
    }

    @Test
    @DisplayName("히스토리 날짜가 없으면 저장에 실패한다")
    void saveHistoryRejectsMissingHistoryDate() {
        // when, then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "step": 1000,
                          "distance": 700,
                          "calories": 50
                        }
                        """)
                .when()
                .post("/histories")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .apply(document("history-save-missing-date",
                        requestFields(
                                fieldWithPath("step").description("걸음 수"),
                                fieldWithPath("distance").description("거리"),
                                fieldWithPath("calories").description("칼로리")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
        verify(historyCommandService, never()).saveHistory(Mockito.anyLong(), Mockito.any());
    }

    @Test
    @DisplayName("음수 히스토리 값이면 저장에 실패한다")
    void saveHistoryRejectsNegativeHistoryValue() {
        // when, then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "historyDate": "2026-07-23",
                          "step": -1,
                          "distance": 700,
                          "calories": 50
                        }
                        """)
                .when()
                .post("/histories")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .apply(document("history-save-invalid-value",
                        requestFields(
                                fieldWithPath("historyDate").description("히스토리 날짜(ISO-8601 yyyy-MM-dd)"),
                                fieldWithPath("step").description("걸음 수"),
                                fieldWithPath("distance").description("거리"),
                                fieldWithPath("calories").description("칼로리")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
        verify(historyCommandService, never()).saveHistory(Mockito.anyLong(), Mockito.any());
    }
}
