package com.wecandoit.history.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.history.controller.request.HistorySaveRequest;
import com.wecandoit.history.service.HistoryCommandService;
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

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new HistoryController(historyCommandService))
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
