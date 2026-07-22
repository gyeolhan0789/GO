package com.wecandoit.bingo.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.wecandoit.bingo.controller.response.BingoBoardResponse;
import com.wecandoit.bingo.controller.response.BingoCellResponse;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.service.BingoService;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.mission.controller.response.MissionResponse;
import io.restassured.http.ContentType;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import java.time.LocalDateTime;
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

@DisplayName("빙고판 API")
@ExtendWith(RestDocumentationExtension.class)
class BingoControllerTest {

    private final BingoService bingoService = Mockito.mock(BingoService.class);

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new BingoController(bingoService))
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
    @DisplayName("빙고판을 생성하면 칸별 미션 정보를 포함한 빙고판을 반환한다")
    void generateBoardReturnsCreatedBoard() {
        // given
        MissionResponse mission = new MissionResponse(
                1L,
                "https://example.com/mission.png",
                "OBJECT",
                "미션 제목",
                "미션 설명",
                null,
                LocalDateTime.of(2026, 7, 22, 10, 0)
        );
        BingoBoardResponse response = new BingoBoardResponse(
                100L,
                10L,
                3,
                BingoBoardStatus.CREATED,
                List.of(new BingoCellResponse(0, 0, mission))
        );
        when(bingoService.generateBoard(1L, 10L)).thenReturn(response);

        // when, then
        given()
                .when()
                .post("/rooms/{roomId}/bingo-boards", 10L)
                .then()
                .statusCode(HttpStatus.CREATED.value())
                .body("bingoBoardId", equalTo(100))
                .body("roomId", equalTo(10))
                .body("boardSize", equalTo(3))
                .body("status", equalTo("CREATED"))
                .body("cells[0].row", equalTo(0))
                .body("cells[0].col", equalTo(0))
                .body("cells[0].mission.missionId", equalTo(1))
                .apply(document("bingo-boards-create",
                        pathParameters(
                                parameterWithName("roomId").description("빙고판을 생성할 게임방 ID")
                        ),
                        responseFields(
                                fieldWithPath("bingoBoardId").description("생성된 빙고판 ID"),
                                fieldWithPath("roomId").description("게임방 ID"),
                                fieldWithPath("boardSize").description("빙고판 크기"),
                                fieldWithPath("status").description("빙고판 상태"),
                                fieldWithPath("cells[].row").description("칸의 행 위치"),
                                fieldWithPath("cells[].col").description("칸의 열 위치"),
                                fieldWithPath("cells[].mission.missionId").description("배정된 미션 ID"),
                                fieldWithPath("cells[].mission.missionImageUrl").description("미션 이미지 URL"),
                                fieldWithPath("cells[].mission.type").description("미션 타입"),
                                fieldWithPath("cells[].mission.title").description("미션 제목"),
                                fieldWithPath("cells[].mission.detail").description("미션 설명"),
                                fieldWithPath("cells[].mission.decisionCondition").description("미션 판정 조건"),
                                fieldWithPath("cells[].mission.createdAt").description("미션 생성 시각")
                        )
                ));
    }

    @Test
    @DisplayName("존재하지 않는 게임방이면 빙고판 생성에 실패한다")
    void generateBoardRejectsMissingRoom() {
        // given
        doThrow(new CustomException(ErrorCode.ROOM_NOT_FOUND))
                .when(bingoService)
                .generateBoard(1L, 10L);

        // when, then
        given()
                .when()
                .post("/rooms/{roomId}/bingo-boards", 10L)
                .then()
                .statusCode(HttpStatus.NOT_FOUND.value());
    }

    @Test
    @DisplayName("방장이 아니면 빙고판 생성에 실패한다")
    void generateBoardRejectsNonHost() {
        // given
        doThrow(new CustomException(ErrorCode.BINGO_BOARD_GENERATE_FORBIDDEN))
                .when(bingoService)
                .generateBoard(1L, 10L);

        // when, then
        given()
                .when()
                .post("/rooms/{roomId}/bingo-boards", 10L)
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }
}
