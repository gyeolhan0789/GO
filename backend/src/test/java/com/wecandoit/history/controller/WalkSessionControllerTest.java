package com.wecandoit.history.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.willReturn;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoBoardType;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.history.controller.response.WalkSessionBingoBoardResponse;
import com.wecandoit.history.controller.response.WalkSessionBingoCellResponse;
import com.wecandoit.history.controller.response.WalkSessionDetailResponse;
import com.wecandoit.history.controller.response.WalkSessionResponse;
import com.wecandoit.history.controller.response.WalkSessionStartResponse;
import com.wecandoit.history.service.WalkSessionCommandService;
import com.wecandoit.history.service.WalkSessionCommandService.CompletionResult;
import com.wecandoit.history.service.WalkSessionCommandService.StartResult;
import com.wecandoit.history.service.WalkSessionReadService;
import com.wecandoit.mission.controller.response.MissionResponse;
import com.wecandoit.mission.domain.MissionType;
import io.restassured.http.ContentType;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.restdocs.RestDocumentationContextProvider;
import org.springframework.restdocs.RestDocumentationExtension;
import org.springframework.restdocs.payload.FieldDescriptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("산책 세션 API")
@ExtendWith({RestDocumentationExtension.class, MockitoExtension.class})
class WalkSessionControllerTest {

    @Mock
    private WalkSessionCommandService walkSessionCommandService;
    @Mock
    private WalkSessionReadService walkSessionReadService;

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(
                        new WalkSessionController(walkSessionCommandService, walkSessionReadService))
                .setControllerAdvice(new CustomExceptionHandler())
                .setCustomArgumentResolvers(
                        new LoginMemberIdArgumentResolver(),
                        new PageableHandlerMethodArgumentResolver()
                )
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
    @DisplayName("산책 세션을 시작하면 백엔드에서 생성한 세션 키를 반환한다")
    void startWalkSessionReturnsSessionKey() {
        // given
        willReturn(new StartResult(startResponse(), true))
                .given(walkSessionCommandService)
                .startSession(eq(1L), any());

        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "roomId": 10,
                          "bingoBoardId": 30
                        }
                        """)
                .when()
                .post("/walk-sessions/start")
                .then()
                .statusCode(HttpStatus.CREATED.value())
                .body("walkSessionKey", equalTo("2ae853f8-ff73-48fc-b166-4b85daf9960c"))
                .body("roomId", equalTo(10))
                .body("initialBingoBoardId", equalTo(30))
                .apply(document("walk-session-start",
                        requestFields(
                                fieldWithPath("roomId").description("Walk room ID"),
                                fieldWithPath("bingoBoardId").description("Initial bingo board ID").optional()
                        ),
                        responseFields(
                                fieldWithPath("walkSessionKey").description("Backend-issued walk session UUID"),
                                fieldWithPath("roomId").description("Walk room ID"),
                                fieldWithPath("roomName").description("Walk room name"),
                                fieldWithPath("mode").description("Walk room game mode"),
                                fieldWithPath("initialBingoBoardId").description("Initial bingo board ID").optional(),
                                fieldWithPath("startedAt").description("UTC session start time"),
                                fieldWithPath("expiresAt").description("UTC session expiration time")
                        )
                ));
    }

    @Test
    @DisplayName("산책 세션이 새로 완료되면 201과 세션 요약을 반환한다")
    void completeWalkSessionReturnsCreatedSession() {
        // given
        willReturn(new CompletionResult(summary(), true))
                .given(walkSessionCommandService)
                .completeSession(eq(1L), any());

        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "walkSessionKey": "2ae853f8-ff73-48fc-b166-4b85daf9960c",
                          "endedAt": "2026-08-03T10:42:15+09:00",
                          "activeDurationSeconds": 2400,
                          "step": 4832,
                          "distance": 3382,
                          "calories": 214
                        }
                        """)
                .when()
                .post("/walk-sessions")
                .then()
                .statusCode(HttpStatus.CREATED.value())
                .body("walkSessionId", equalTo(50))
                .body("durationSeconds", equalTo(2_535))
                .body("activeDurationSeconds", equalTo(2_400))
                .body("achievedMissionCount", equalTo(1))
                .apply(document("walk-session-complete",
                        requestFields(
                                fieldWithPath("walkSessionKey").description("Backend-issued walk session UUID"),
                                fieldWithPath("endedAt").description("Walk end time with offset"),
                                fieldWithPath("activeDurationSeconds")
                                        .description("Actual active walk duration in seconds, excluding pauses")
                                        .optional(),
                                fieldWithPath("step").description("Step count for this walk"),
                                fieldWithPath("distance").description("Distance for this walk"),
                                fieldWithPath("calories").description("Calories for this walk")
                        ),
                        responseFields(summaryFields())
                ));
    }

    @Test
    @DisplayName("이미 완료된 산책 세션을 다시 완료하면 200과 기존 세션을 반환한다")
    void completeWalkSessionReturnsExistingSession() {
        // given
        willReturn(new CompletionResult(summary(), false))
                .given(walkSessionCommandService)
                .completeSession(eq(1L), any());

        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "walkSessionKey": "2ae853f8-ff73-48fc-b166-4b85daf9960c",
                          "endedAt": "2026-08-03T10:42:15+09:00",
                          "activeDurationSeconds": 2400,
                          "step": 4832,
                          "distance": 3382,
                          "calories": 214
                        }
                        """)
                .when()
                .post("/walk-sessions")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("walkSessionId", equalTo(50));
    }

    @Test
    @DisplayName("산책 세션 키 형식이 올바르지 않으면 완료 요청을 거부한다")
    void completeWalkSessionRejectsInvalidWalkSessionKey() {
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "walkSessionKey": "invalid-key",
                          "endedAt": "2026-08-03T10:42:15+09:00",
                          "step": 4832,
                          "distance": 3382,
                          "calories": 214
                        }
                        """)
                .when()
                .post("/walk-sessions")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
    }

    @Test
    @DisplayName("산책 세션 목록을 최신 종료순 Slice로 반환한다")
    void getWalkSessionsReturnsSlice() {
        // given
        willReturn(new SliceResponse<>(List.of(summary()), false))
                .given(walkSessionReadService)
                .getWalkSessions(eq(1L), isNull(), any(Pageable.class));

        // when & then
        given()
                .queryParam("page", 0)
                .queryParam("size", 10)
                .when()
                .get("/walk-sessions")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("content[0].roomName", equalTo("Daily Walk Room"))
                .body("content[0].step", equalTo(4_832))
                .body("hasNext", equalTo(false))
                .apply(document("walk-session-list",
                        queryParameters(
                                parameterWithName("roomId").description("Optional room ID filter").optional(),
                                parameterWithName("page").description("Page number"),
                                parameterWithName("size").description("Page size")
                        ),
                        responseFields(
                                fieldWithPath("content[]").description("Walk sessions"),
                                fieldWithPath("hasNext").description("Whether another slice exists")
                        ).andWithPrefix("content[].", summaryFields())
                ));
    }

    @Test
    @DisplayName("방 ID로 산책 세션 목록을 필터링할 수 있다")
    void getWalkSessionsReturnsRoomSessions() {
        // given
        willReturn(new SliceResponse<>(List.of(summary()), false))
                .given(walkSessionReadService)
                .getWalkSessions(eq(1L), eq(10L), any(Pageable.class));

        // when & then
        given()
                .queryParam("roomId", 10L)
                .queryParam("page", 0)
                .queryParam("size", 10)
                .when()
                .get("/walk-sessions")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("content[0].roomId", equalTo(10));
    }

    @Test
    @DisplayName("산책 세션 상세는 세션 요약과 빙고 달성 정보를 반환한다")
    void getWalkSessionReturnsDetail() {
        // given
        willReturn(detail()).given(walkSessionReadService).getWalkSession(1L, 50L);

        // when & then
        given()
                .when()
                .get("/walk-sessions/{walkSessionId}", 50L)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("bingoBoards[0].cells[0].achievedInSession", equalTo(true))
                .apply(document("walk-session-detail",
                        pathParameters(
                                parameterWithName("walkSessionId").description("Walk session ID")
                        ),
                        responseFields(detailFields())
                ));
    }

    private WalkSessionStartResponse startResponse() {
        return new WalkSessionStartResponse(
                UUID.fromString("2ae853f8-ff73-48fc-b166-4b85daf9960c"),
                10L,
                "Daily Walk Room",
                GameMode.COOPERATE,
                30L,
                Instant.parse("2026-08-03T01:00:00Z"),
                Instant.parse("2026-08-04T01:00:00Z")
        );
    }

    private WalkSessionResponse summary() {
        return new WalkSessionResponse(
                50L,
                10L,
                "Daily Walk Room",
                GameMode.COOPERATE,
                Instant.parse("2026-08-03T01:00:00Z"),
                Instant.parse("2026-08-03T01:42:15Z"),
                2_535L,
                2_400L,
                4_832,
                3_382,
                214,
                30L,
                1
        );
    }

    private WalkSessionDetailResponse detail() {
        MissionResponse mission = new MissionResponse(
                100L,
                "https://example.com/mission.png",
                MissionType.OBJECT,
                "Find a blue object",
                "Take a picture of a blue object.",
                "{\"target\":\"blue\"}",
                50L,
                LocalDateTime.of(2026, 8, 1, 10, 0)
        );
        WalkSessionBingoCellResponse cell = new WalkSessionBingoCellResponse(
                40L,
                0,
                0,
                mission,
                BingoCellVerificationStatus.APPROVED,
                1L,
                null,
                true,
                Instant.parse("2026-08-03T01:20:00Z")
        );
        WalkSessionBingoBoardResponse board = new WalkSessionBingoBoardResponse(
                30L,
                20L,
                BingoBoardType.SHARED,
                3,
                null,
                10_000,
                BingoBoardStatus.ACTIVE,
                Instant.parse("2026-08-01T01:00:00Z"),
                null,
                List.of(cell)
        );
        WalkSessionResponse summary = summary();
        return new WalkSessionDetailResponse(
                summary.walkSessionId(),
                summary.roomId(),
                summary.roomName(),
                summary.mode(),
                summary.startedAt(),
                summary.endedAt(),
                summary.durationSeconds(),
                summary.activeDurationSeconds(),
                summary.step(),
                summary.distance(),
                summary.calories(),
                summary.initialBingoBoardId(),
                summary.achievedMissionCount(),
                List.of(board)
        );
    }

    private FieldDescriptor[] summaryFields() {
        return new FieldDescriptor[]{
                fieldWithPath("walkSessionId").description("Walk session ID"),
                fieldWithPath("roomId").description("Walk room ID"),
                fieldWithPath("roomName").description("Walk room name"),
                fieldWithPath("mode").description("Walk room game mode"),
                fieldWithPath("startedAt").description("UTC walk start time"),
                fieldWithPath("endedAt").description("UTC walk end time"),
                fieldWithPath("durationSeconds").description("Walk duration in seconds"),
                fieldWithPath("activeDurationSeconds")
                        .description("Actual active walk duration in seconds, excluding pauses"),
                fieldWithPath("step").description("Step count"),
                fieldWithPath("distance").description("Distance"),
                fieldWithPath("calories").description("Calories"),
                fieldWithPath("initialBingoBoardId").description("Initial bingo board ID").optional(),
                fieldWithPath("achievedMissionCount").description("Approved missions achieved in this session")
        };
    }

    private FieldDescriptor[] detailFields() {
        List<FieldDescriptor> fields = new ArrayList<>(List.of(summaryFields()));
        fields.add(fieldWithPath("bingoBoards[].bingoBoardId").description("Bingo board ID"));
        fields.add(fieldWithPath("bingoBoards[].gameId").description("Game cycle ID"));
        fields.add(fieldWithPath("bingoBoards[].boardType").description("Shared or personal board type"));
        fields.add(fieldWithPath("bingoBoards[].boardSize").description("Bingo board size"));
        fields.add(fieldWithPath("bingoBoards[].targetBingoCount").description("Target bingo count").optional());
        fields.add(fieldWithPath("bingoBoards[].targetStepCount").description("Target step count").optional());
        fields.add(fieldWithPath("bingoBoards[].status").description("Bingo board status"));
        fields.add(fieldWithPath("bingoBoards[].createdAt").description("Bingo board creation time").optional());
        fields.add(fieldWithPath("bingoBoards[].completedAt").description("Bingo board completion time").optional());
        fields.add(fieldWithPath("bingoBoards[].cells[].cellId").description("Bingo cell ID"));
        fields.add(fieldWithPath("bingoBoards[].cells[].row").description("Cell row"));
        fields.add(fieldWithPath("bingoBoards[].cells[].col").description("Cell column"));
        fields.add(fieldWithPath("bingoBoards[].cells[].mission.missionId").description("Mission ID"));
        fields.add(fieldWithPath("bingoBoards[].cells[].mission.missionImageUrl").description("Mission image URL"));
        fields.add(fieldWithPath("bingoBoards[].cells[].mission.type").description("Mission type"));
        fields.add(fieldWithPath("bingoBoards[].cells[].mission.title").description("Mission title"));
        fields.add(fieldWithPath("bingoBoards[].cells[].mission.detail").description("Mission detail"));
        fields.add(fieldWithPath("bingoBoards[].cells[].mission.decisionCondition").description("Mission decision condition"));
        fields.add(fieldWithPath("bingoBoards[].cells[].mission.point").description("Mission reward point"));
        fields.add(fieldWithPath("bingoBoards[].cells[].mission.createdAt").description("Mission creation time").optional());
        fields.add(fieldWithPath("bingoBoards[].cells[].verificationStatus").description("Current verification status").optional());
        fields.add(fieldWithPath("bingoBoards[].cells[].submittedByMemberId").description("Submitting member ID").optional());
        fields.add(fieldWithPath("bingoBoards[].cells[].rejectionReason").description("Rejection reason").optional());
        fields.add(fieldWithPath("bingoBoards[].cells[].achievedInSession").description("Whether achieved in this session"));
        fields.add(fieldWithPath("bingoBoards[].cells[].achievedAt").description("Achievement time in this session").optional());
        return fields.toArray(FieldDescriptor[]::new);
    }
}
