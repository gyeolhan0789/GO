package com.wecandoit.bingo.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.BDDMockito.willThrow;
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
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.bingo.service.BingoCommandService;
import com.wecandoit.bingo.service.BingoReadService;
import com.wecandoit.bingo.service.MissionVerificationFacade;
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
import org.mockito.BDDMockito;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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
@ExtendWith({RestDocumentationExtension.class, MockitoExtension.class})
class BingoControllerTest {

    @Mock
    private BingoCommandService bingoCommandService;

    @Mock
    private BingoReadService bingoReadService;

    @Mock
    private MissionVerificationFacade missionVerificationFacade;

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(
                        new BingoController(bingoCommandService, bingoReadService, missionVerificationFacade))
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
    @DisplayName("활성 빙고판을 조회하면 완료/갱신가능 여부를 포함해 반환한다")
    void getActiveBoardReturnsBoardWithCompletionState() {
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
                3,
                1,
                9,
                3,
                BingoBoardStatus.IN_PROGRESS,
                List.of(new BingoCellResponse(
                        1000L,
                        0,
                        0,
                        mission,
                        BingoCellVerificationStatus.REJECTED,
                        2L,
                        "인증 이미지가 조건과 다릅니다."
                )),
                true,
                true
        );
        BDDMockito.given(bingoReadService.getActiveBoard(1L, 10L)).willReturn(response);

        // when & then
        given()
                .when()
                .get("/rooms/{roomId}/bingo-boards/active", 10L)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("bingoBoardId", equalTo(100))
                .body("targetBingoCount", equalTo(3))
                .body("completedBingoCount", equalTo(1))
                .body("totalCellCount", equalTo(9))
                .body("approvedCellCount", equalTo(3))
                .body("completed", equalTo(true))
                .body("canRenew", equalTo(true))
                .body("cells[0].cellId", equalTo(1000))
                .body("cells[0].submittedByMemberId", equalTo(2))
                .body("cells[0].verificationStatus", equalTo("REJECTED"))
                .body("cells[0].rejectionReason", equalTo("인증 이미지가 조건과 다릅니다."))
                .apply(document("bingo-boards-active",
                        pathParameters(
                                parameterWithName("roomId").description("활성 빙고판을 조회할 게임방 ID")
                        ),
                        responseFields(
                                fieldWithPath("bingoBoardId").description("빙고판 ID"),
                                fieldWithPath("roomId").description("게임방 ID"),
                                fieldWithPath("boardSize").description("빙고판 크기"),
                                fieldWithPath("targetBingoCount").description("게임 목표 빙고 수"),
                                fieldWithPath("completedBingoCount").description("현재 완성된 빙고 수"),
                                fieldWithPath("totalCellCount").description("전체 셀 수"),
                                fieldWithPath("approvedCellCount").description("승인된 셀 수"),
                                fieldWithPath("status").description("빙고판 상태"),
                                fieldWithPath("cells[].cellId").description("빙고 셀 ID"),
                                fieldWithPath("cells[].row").description("칸의 행 위치"),
                                fieldWithPath("cells[].col").description("칸의 열 위치"),
                                fieldWithPath("cells[].mission.missionId").description("배정된 미션 ID"),
                                fieldWithPath("cells[].mission.missionImageUrl").description("미션 이미지 URL"),
                                fieldWithPath("cells[].mission.type").description("미션 타입"),
                                fieldWithPath("cells[].mission.title").description("미션 제목"),
                                fieldWithPath("cells[].mission.detail").description("미션 설명"),
                                fieldWithPath("cells[].mission.decisionCondition").description("미션 판정 조건"),
                                fieldWithPath("cells[].mission.createdAt").description("미션 생성 시각"),
                                fieldWithPath("cells[].verificationStatus").description("미션 인증 상태"),
                                fieldWithPath("cells[].submittedByMemberId").description("미션 제출 참여자 ID"),
                                fieldWithPath("cells[].rejectionReason").description("미션 거절 사유"),
                                fieldWithPath("completed").description("빙고판 100% 완료 여부"),
                                fieldWithPath("canRenew").description("조기 갱신 가능 여부(방장이고 완료된 경우에만 true)")
                        )
                ));
    }

    @Test
    @DisplayName("활성 빙고판이 없으면 조회에 실패한다")
    void getActiveBoardRejectsMissingBoard() {
        // given
        willThrow(new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND))
                .given(bingoReadService)
                .getActiveBoard(1L, 10L);

        // when & then
        given()
                .when()
                .get("/rooms/{roomId}/bingo-boards/active", 10L)
                .then()
                .statusCode(HttpStatus.NOT_FOUND.value());
    }

    @Test
    @DisplayName("칸을 제출하면 AI 검증 결과를 반환한다")
    void submitCellReturnsVerificationResult() {
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
        BingoCellResponse response = new BingoCellResponse(
                1000L, 0, 0, mission, BingoCellVerificationStatus.APPROVED, 1L, null
        );
        BDDMockito.given(missionVerificationFacade.submitAndVerify(1L, 10L, 1000L, "https://example.com/proof.png"))
                .willReturn(response);

        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("{\"submitUrl\":\"https://example.com/proof.png\"}")
                .when()
                .post("/rooms/{roomId}/bingo-boards/cells/{cellId}/submit", 10L, 1000L)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("cellId", equalTo(1000))
                .body("row", equalTo(0))
                .body("col", equalTo(0))
                .body("mission.missionId", equalTo(1))
                .body("verificationStatus", equalTo("APPROVED"))
                .apply(document("bingo-cells-submit",
                        pathParameters(
                                parameterWithName("roomId").description("칸을 제출할 게임방 ID"),
                                parameterWithName("cellId").description("제출할 빙고 칸 ID")
                        ),
                        responseFields(
                                fieldWithPath("cellId").description("빙고 셀 ID"),
                                fieldWithPath("row").description("칸의 행 위치"),
                                fieldWithPath("col").description("칸의 열 위치"),
                                fieldWithPath("mission.missionId").description("배정된 미션 ID"),
                                fieldWithPath("mission.missionImageUrl").description("미션 이미지 URL"),
                                fieldWithPath("mission.type").description("미션 타입"),
                                fieldWithPath("mission.title").description("미션 제목"),
                                fieldWithPath("mission.detail").description("미션 설명"),
                                fieldWithPath("mission.decisionCondition").description("미션 판정 조건"),
                                fieldWithPath("mission.createdAt").description("미션 생성 시각"),
                                fieldWithPath("verificationStatus").description("AI 검증 후 인증 상태(APPROVED/REJECTED)"),
                                fieldWithPath("submittedByMemberId").description("미션 제출 참여자 ID"),
                                fieldWithPath("rejectionReason").description("거절 사유(승인 시 null)")
                        )
                ));
    }

    @Test
    @DisplayName("AI 검증 서버 호출에 실패하면 503을 반환한다")
    void submitCellReturnsServiceUnavailableWhenAiVerificationFails() {
        // given
        willThrow(new CustomException(ErrorCode.AI_VERIFICATION_FAILED))
                .given(missionVerificationFacade)
                .submitAndVerify(1L, 10L, 1000L, "https://example.com/proof.png");

        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("{\"submitUrl\":\"https://example.com/proof.png\"}")
                .when()
                .post("/rooms/{roomId}/bingo-boards/cells/{cellId}/submit", 10L, 1000L)
                .then()
                .statusCode(HttpStatus.SERVICE_UNAVAILABLE.value());
    }

    @Test
    @DisplayName("존재하지 않는 칸이면 제출에 실패한다")
    void submitCellRejectsMissingCell() {
        // given
        willThrow(new CustomException(ErrorCode.BINGO_CELL_NOT_FOUND))
                .given(missionVerificationFacade)
                .submitAndVerify(1L, 10L, 1000L, "https://example.com/proof.png");

        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("{\"submitUrl\":\"https://example.com/proof.png\"}")
                .when()
                .post("/rooms/{roomId}/bingo-boards/cells/{cellId}/submit", 10L, 1000L)
                .then()
                .statusCode(HttpStatus.NOT_FOUND.value());
    }

    @Test
    @DisplayName("방 멤버가 아니면 제출에 실패한다")
    void submitCellRejectsNonMember() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN))
                .given(missionVerificationFacade)
                .submitAndVerify(1L, 10L, 1000L, "https://example.com/proof.png");

        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("{\"submitUrl\":\"https://example.com/proof.png\"}")
                .when()
                .post("/rooms/{roomId}/bingo-boards/cells/{cellId}/submit", 10L, 1000L)
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @Test
    @DisplayName("submitUrl이 비어있으면 제출에 실패한다")
    void submitCellRejectsBlankSubmitUrl() {
        // given & when & then
        given()
                .contentType(ContentType.JSON)
                .body("{\"submitUrl\":\"\"}")
                .when()
                .post("/rooms/{roomId}/bingo-boards/cells/{cellId}/submit", 10L, 1000L)
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
    }

    @Test
    @DisplayName("조기 갱신하면 새로 발급된 빙고판을 반환한다")
    void renewBoardReturnsNewlyIssuedBoard() {
        // given
        MissionResponse mission = new MissionResponse(
                2L,
                "https://example.com/mission2.png",
                "OBJECT",
                "새 미션 제목",
                "새 미션 설명",
                null,
                LocalDateTime.of(2026, 7, 22, 11, 0)
        );
        BingoBoardResponse response = new BingoBoardResponse(
                101L,
                10L,
                3,
                3,
                0,
                1,
                0,
                BingoBoardStatus.IN_PROGRESS,
                List.of(new BingoCellResponse(1001L, 0, 0, mission, null, null, null)),
                false,
                false
        );
        BDDMockito.given(bingoCommandService.renewBoard(1L, 10L)).willReturn(response);

        // when & then
        given()
                .when()
                .post("/rooms/{roomId}/bingo-boards/renewal", 10L)
                .then()
                .statusCode(HttpStatus.CREATED.value())
                .body("bingoBoardId", equalTo(101))
                .body("status", equalTo("IN_PROGRESS"))
                .apply(document("bingo-boards-renewal",
                        pathParameters(
                                parameterWithName("roomId").description("빙고판을 조기 갱신할 게임방 ID")
                        ),
                        responseFields(
                                fieldWithPath("bingoBoardId").description("새로 발급된 빙고판 ID"),
                                fieldWithPath("roomId").description("게임방 ID"),
                                fieldWithPath("boardSize").description("빙고판 크기"),
                                fieldWithPath("targetBingoCount").description("게임 목표 빙고 수"),
                                fieldWithPath("completedBingoCount").description("현재 완성된 빙고 수"),
                                fieldWithPath("totalCellCount").description("전체 셀 수"),
                                fieldWithPath("approvedCellCount").description("승인된 셀 수"),
                                fieldWithPath("status").description("빙고판 상태"),
                                fieldWithPath("cells[].cellId").description("빙고 셀 ID"),
                                fieldWithPath("cells[].row").description("칸의 행 위치"),
                                fieldWithPath("cells[].col").description("칸의 열 위치"),
                                fieldWithPath("cells[].mission.missionId").description("배정된 미션 ID"),
                                fieldWithPath("cells[].mission.missionImageUrl").description("미션 이미지 URL"),
                                fieldWithPath("cells[].mission.type").description("미션 타입"),
                                fieldWithPath("cells[].mission.title").description("미션 제목"),
                                fieldWithPath("cells[].mission.detail").description("미션 설명"),
                                fieldWithPath("cells[].mission.decisionCondition").description("미션 판정 조건"),
                                fieldWithPath("cells[].mission.createdAt").description("미션 생성 시각"),
                                fieldWithPath("cells[].verificationStatus").description("미션 인증 상태"),
                                fieldWithPath("cells[].submittedByMemberId").description("미션 제출 참여자 ID"),
                                fieldWithPath("cells[].rejectionReason").description("미션 거절 사유"),
                                fieldWithPath("completed").description("빙고판 100% 완료 여부"),
                                fieldWithPath("canRenew").description("조기 갱신 가능 여부(방장이고 완료된 경우에만 true)")
                        )
                ));
    }

    @Test
    @DisplayName("완료되지 않은 빙고판을 갱신하려 하면 실패한다")
    void renewBoardRejectsIncompleteBoard() {
        // given
        willThrow(new CustomException(ErrorCode.BINGO_BOARD_NOT_COMPLETED))
                .given(bingoCommandService)
                .renewBoard(1L, 10L);

        // when & then
        given()
                .when()
                .post("/rooms/{roomId}/bingo-boards/renewal", 10L)
                .then()
                .statusCode(HttpStatus.CONFLICT.value());
    }

    @Test
    @DisplayName("방장이 아니면 조기 갱신에 실패한다")
    void renewBoardRejectsNonHost() {
        // given
        willThrow(new CustomException(ErrorCode.BINGO_BOARD_RENEWAL_FORBIDDEN))
                .given(bingoCommandService)
                .renewBoard(1L, 10L);

        // when & then
        given()
                .when()
                .post("/rooms/{roomId}/bingo-boards/renewal", 10L)
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }
}
