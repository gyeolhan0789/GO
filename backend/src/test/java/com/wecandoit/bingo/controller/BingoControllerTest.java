package com.wecandoit.bingo.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willReturn;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.partWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.requestParts;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.relaxedResponseFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.wecandoit.bingo.controller.response.BingoBoardResponse;
import com.wecandoit.bingo.controller.response.BingoBoardResponse.BattleParticipantProgressResponse;
import com.wecandoit.bingo.controller.response.BingoBoardResponse.BattleProgressResponse;
import com.wecandoit.bingo.controller.response.BingoCellResponse;
import com.wecandoit.bingo.controller.response.BingoCellSubmitResponse;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.bingo.service.BingoCommandService;
import com.wecandoit.bingo.service.BingoReadService;
import com.wecandoit.bingo.service.MissionVerificationFacade;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.RoomStatus;
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
import org.springframework.web.multipart.MultipartFile;

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
                200L,
                10L,
                3,
                3,
                10_000,
                1,
                9,
                3,
                BingoBoardStatus.ACTIVE,
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
                true,
                false,
                null,
                null
        );
        willReturn(response).given(bingoReadService).getActiveBoard(1L, 10L);

        // when & then
        given()
                .when()
                .get("/rooms/{roomId}/bingo-boards/active", 10L)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("bingoBoardId", equalTo(100))
                .body("gameId", equalTo(200))
                .body("targetBingoCount", equalTo(3))
                .body("targetStepCount", equalTo(10_000))
                .body("completedBingoCount", equalTo(1))
                .body("totalCellCount", equalTo(9))
                .body("approvedCellCount", equalTo(3))
                .body("completed", equalTo(true))
                .body("canRenew", equalTo(true))
                .body("renewalRequired", equalTo(false))
                .body("renewalMessage", nullValue())
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
                                fieldWithPath("gameId").description("게임 회차 ID"),
                                fieldWithPath("roomId").description("게임방 ID"),
                                fieldWithPath("boardSize").description("빙고판 크기"),
                                fieldWithPath("targetBingoCount").description("게임 목표 빙고 수"),
                                fieldWithPath("targetStepCount").description("해당 빙고판의 목표 걸음 수"),
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
                                fieldWithPath("canRenew").description("빙고판 갱신 가능 여부"),
                                fieldWithPath("renewalRequired").description("빙고판 생성 후 7일 경과로 인한 갱신 필요 여부"),
                                fieldWithPath("renewalMessage").description("갱신 필요 안내 메시지(필요하지 않으면 null)"),
                                fieldWithPath("battleProgress").optional().description("대결 모드 참가자 진행도")
                        )
                ));
    }

    @Test
    @DisplayName("활성 빙고판이 없으면 조회에 실패한다")
    void getActiveBoardReturnsBattleProgressWithoutOpponentSubmissionDetails() {
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
                201L,
                200L,
                10L,
                3,
                3,
                null,
                1,
                9,
                2,
                BingoBoardStatus.ACTIVE,
                List.of(new BingoCellResponse(
                        1001L,
                        0,
                        0,
                        mission,
                        BingoCellVerificationStatus.APPROVED,
                        1L,
                        null
                )),
                false,
                false,
                false,
                null,
                new BattleProgressResponse(
                        RoomStatus.ACTIVE,
                        GameStatus.ACTIVE,
                        new BattleParticipantProgressResponse(1L, 201L, 9, 2, 1, false),
                        new BattleParticipantProgressResponse(2L, 202L, 9, 4, 2, false),
                        null
                )
        );
        willReturn(response).given(bingoReadService).getActiveBoard(1L, 10L);

        // when & then
        given()
                .when()
                .get("/rooms/{roomId}/bingo-boards/active", 10L)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("bingoBoardId", equalTo(201))
                .body("cells[0].submittedByMemberId", equalTo(1))
                .body("battleProgress.roomStatus", equalTo("ACTIVE"))
                .body("battleProgress.gameStatus", equalTo("ACTIVE"))
                .body("battleProgress.me.memberId", equalTo(1))
                .body("battleProgress.me.bingoBoardId", equalTo(201))
                .body("battleProgress.opponent.memberId", equalTo(2))
                .body("battleProgress.opponent.bingoBoardId", equalTo(202))
                .body("battleProgress.opponent.approvedCellCount", equalTo(4))
                .body("battleProgress.opponent.submittedByMemberId", nullValue())
                .body("battleProgress.opponent.rejectionReason", nullValue())
                .body("battleProgress.result", nullValue());
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
        BingoCellSubmitResponse response = new BingoCellSubmitResponse(
                1000L, 0, 0, mission, BingoCellVerificationStatus.APPROVED, 1L, null, 30L
        );
        willReturn(response)
                .given(missionVerificationFacade)
                .submitAndVerify(eq(1L), eq(10L), eq(1000L), any(MultipartFile.class));

        // when & then
        given()
                .multiPart("image", "proof.png", new byte[]{1, 2, 3}, "image/png")
                .when()
                .post("/rooms/{roomId}/bingo-boards/cells/{cellId}/submit", 10L, 1000L)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("cellId", equalTo(1000))
                .body("row", equalTo(0))
                .body("col", equalTo(0))
                .body("mission.missionId", equalTo(1))
                .body("verificationStatus", equalTo("APPROVED"))
                .body("rewardCash", equalTo(30))
                .apply(document("bingo-cells-submit",
                        pathParameters(
                                parameterWithName("roomId").description("칸을 제출할 게임방 ID"),
                                parameterWithName("cellId").description("제출할 빙고 칸 ID")
                        ),
                        requestParts(
                                partWithName("image").description("제출할 미션 인증 사진 (JPEG/PNG, 최대 5MB)")
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
                                fieldWithPath("rejectionReason").description("거절 사유(승인 시 null)"),
                                fieldWithPath("rewardCash").description("이번 인증으로 지급된 캐시")
                        )
                ));
    }

    @Test
    @DisplayName("AI 검증 서버 호출에 실패하면 503을 반환한다")
    void submitCellReturnsServiceUnavailableWhenAiVerificationFails() {
        // given
        willThrow(new CustomException(ErrorCode.AI_VERIFICATION_FAILED))
                .given(missionVerificationFacade)
                .submitAndVerify(eq(1L), eq(10L), eq(1000L), any(MultipartFile.class));

        // when & then
        given()
                .multiPart("image", "proof.png", new byte[]{1, 2, 3}, "image/png")
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
                .submitAndVerify(eq(1L), eq(10L), eq(1000L), any(MultipartFile.class));

        // when & then
        given()
                .multiPart("image", "proof.png", new byte[]{1, 2, 3}, "image/png")
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
                .submitAndVerify(eq(1L), eq(10L), eq(1000L), any(MultipartFile.class));

        // when & then
        given()
                .multiPart("image", "proof.png", new byte[]{1, 2, 3}, "image/png")
                .when()
                .post("/rooms/{roomId}/bingo-boards/cells/{cellId}/submit", 10L, 1000L)
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @Test
    @DisplayName("image 파트가 없으면 제출에 실패한다")
    void submitCellRejectsMissingImagePart() {
        // given & when & then
        given()
                .multiPart("photo", "proof.png", new byte[]{1, 2, 3}, "image/png")
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
                200L,
                10L,
                3,
                3,
                12_000,
                0,
                1,
                0,
                BingoBoardStatus.ACTIVE,
                List.of(new BingoCellResponse(1001L, 0, 0, mission, null, null, null)),
                false,
                false,
                false,
                null,
                null
        );
        willReturn(response)
                .given(bingoCommandService)
                .renewBoard(1L, 10L, 3, 2, 12_000);

        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "boardSize": 3,
                          "targetBingoCount": 2,
                          "targetStepCount": 12000
                        }
                        """)
                .when()
                .post("/rooms/{roomId}/bingo-boards/renewal", 10L)
                .then()
                .statusCode(HttpStatus.CREATED.value())
                .body("bingoBoardId", equalTo(101))
                .body("gameId", equalTo(200))
                .body("targetStepCount", equalTo(12_000))
                .body("status", equalTo("ACTIVE"))
                .apply(document("bingo-boards-renewal",
                        pathParameters(
                                parameterWithName("roomId").description("빙고판을 갱신할 게임방 ID")
                        ),
                        requestFields(
                                fieldWithPath("boardSize").description("새 빙고판 한 변의 크기"),
                                fieldWithPath("targetBingoCount").description("새 회차의 목표 빙고 수"),
                                fieldWithPath("targetStepCount").description("새 빙고판에 설정할 목표 걸음 수")
                        ),
                        responseFields(
                                fieldWithPath("bingoBoardId").description("새로 발급된 빙고판 ID"),
                                fieldWithPath("gameId").description("게임 회차 ID"),
                                fieldWithPath("roomId").description("게임방 ID"),
                                fieldWithPath("boardSize").description("빙고판 크기"),
                                fieldWithPath("targetBingoCount").description("게임 목표 빙고 수"),
                                fieldWithPath("targetStepCount").description("해당 빙고판의 목표 걸음 수"),
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
                                fieldWithPath("canRenew").description("빙고판 갱신 가능 여부"),
                                fieldWithPath("renewalRequired").description("빙고판 생성 후 7일 경과로 인한 갱신 필요 여부"),
                                fieldWithPath("renewalMessage").description("갱신 필요 안내 메시지(필요하지 않으면 null)"),
                                fieldWithPath("battleProgress").optional().description("대결 모드 참가자 진행도")
                        )
                ));
    }

    @Test
    @DisplayName("완료되지 않은 빙고판을 갱신하려 하면 실패한다")
    void renewBoardRejectsIncompleteBoard() {
        // given
        willThrow(new CustomException(ErrorCode.BINGO_BOARD_NOT_COMPLETED))
                .given(bingoCommandService)
                .renewBoard(1L, 10L, 3, 2, 12_000);

        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "boardSize": 3,
                          "targetBingoCount": 2,
                          "targetStepCount": 12000
                        }
                        """)
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
                .renewBoard(1L, 10L, 3, 2, 12_000);

        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "boardSize": 3,
                          "targetBingoCount": 2,
                          "targetStepCount": 12000
                        }
                        """)
                .when()
                .post("/rooms/{roomId}/bingo-boards/renewal", 10L)
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    @Test
    @DisplayName("갱신 목표 걸음 수가 없으면 빙고판 갱신에 실패한다")
    void renewBoardRejectsMissingTargetStepCount() {
        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("{}")
                .when()
                .post("/rooms/{roomId}/bingo-boards/renewal", 10L)
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
    }

    @Test
    @DisplayName("방장이 종료된 대결방에서 재대결 회차를 생성한다")
    void rematchBattleReturnsNewActiveBoard() {
        BingoBoardResponse response = new BingoBoardResponse(
                301L,
                401L,
                10L,
                3,
                2,
                null,
                0,
                9,
                0,
                BingoBoardStatus.ACTIVE,
                List.of(),
                false,
                false,
                false,
                null,
                new BattleProgressResponse(
                        RoomStatus.ACTIVE,
                        GameStatus.ACTIVE,
                        new BattleParticipantProgressResponse(1L, 301L, 9, 0, 0, false),
                        new BattleParticipantProgressResponse(2L, 302L, 9, 0, 0, false),
                        null
                )
        );
        willReturn(response).given(bingoReadService).getActiveBoard(1L, 10L);

        given()
                .when()
                .post("/rooms/{roomId}/battles/rematch", 10L)
                .then()
                .statusCode(HttpStatus.CREATED.value())
                .body("gameId", equalTo(401))
                .body("status", equalTo("ACTIVE"))
                .body("battleProgress.gameStatus", equalTo("ACTIVE"))
                .apply(document("battle-rematch",
                        pathParameters(
                                parameterWithName("roomId").description("재대결할 게임방 ID")
                        ),
                        relaxedResponseFields(
                                fieldWithPath("bingoBoardId").description("호출자의 새 개인 빙고판 ID"),
                                fieldWithPath("gameId").description("새 게임 회차 ID"),
                                fieldWithPath("roomId").description("게임방 ID"),
                                fieldWithPath("boardSize").description("재사용된 빙고판 크기"),
                                fieldWithPath("targetBingoCount").description("재사용된 목표 빙고 수"),
                                fieldWithPath("status").description("새 빙고판 상태"),
                                fieldWithPath("battleProgress.gameStatus").description("새 게임 회차 상태")
                        )
                ));

        then(bingoCommandService).should().rematchBattle(1L, 10L);
        then(bingoReadService).should().getActiveBoard(1L, 10L);
    }
}
