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
import com.wecandoit.history.service.WalkSessionCommandService;
import com.wecandoit.history.service.WalkSessionCommandService.CompletionResult;
import com.wecandoit.history.service.WalkSessionReadService;
import com.wecandoit.mission.controller.response.MissionResponse;
import com.wecandoit.mission.domain.MissionType;
import io.restassured.http.ContentType;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
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
    @DisplayName("산책 세션을 처음 완료하면 201과 세션 요약을 반환한다")
    void completeWalkSessionReturnsCreatedSession() {
        // given
        WalkSessionResponse response = summary();
        willReturn(new CompletionResult(response, true))
                .given(walkSessionCommandService)
                .completeSession(eq(1L), any());

        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "clientSessionKey": "2ae853f8-ff73-48fc-b166-4b85daf9960c",
                          "roomId": 10,
                          "bingoBoardId": 30,
                          "startedAt": "2026-08-03T10:00:00+09:00",
                          "endedAt": "2026-08-03T10:42:15+09:00",
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
                .body("achievedMissionCount", equalTo(1))
                .apply(document("walk-session-complete",
                        requestFields(
                                fieldWithPath("clientSessionKey").description("앱에서 산책 시작 시 생성한 UUID"),
                                fieldWithPath("roomId").description("산책을 진행한 방 ID"),
                                fieldWithPath("bingoBoardId").description("산책 시작 당시 빙고판 ID, 보드가 없으면 null").optional(),
                                fieldWithPath("startedAt").description("오프셋을 포함한 산책 시작 시각"),
                                fieldWithPath("endedAt").description("오프셋을 포함한 산책 종료 시각"),
                                fieldWithPath("step").description("이번 산책 걸음 수"),
                                fieldWithPath("distance").description("이번 산책 거리"),
                                fieldWithPath("calories").description("이번 산책 소모 칼로리")
                        ),
                        summaryResponseFields()
                ));
    }

    @Test
    @DisplayName("같은 산책 세션을 다시 완료하면 기존 세션을 200으로 반환한다")
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
                          "clientSessionKey": "2ae853f8-ff73-48fc-b166-4b85daf9960c",
                          "roomId": 10,
                          "bingoBoardId": 30,
                          "startedAt": "2026-08-03T10:00:00+09:00",
                          "endedAt": "2026-08-03T10:42:15+09:00",
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
    @DisplayName("산책 세션 완료 요청의 UUID 형식이 잘못되면 400을 반환한다")
    void completeWalkSessionRejectsInvalidClientSessionKey() {
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "clientSessionKey": "invalid-key",
                          "roomId": 10,
                          "startedAt": "2026-08-03T10:00:00+09:00",
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
    @DisplayName("내 산책 세션 목록을 최신 종료순 Slice로 반환한다")
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
                .body("content[0].roomName", equalTo("저녁 산책방"))
                .body("content[0].step", equalTo(4_832))
                .body("hasNext", equalTo(false))
                .apply(document("walk-session-list",
                        queryParameters(
                                parameterWithName("roomId").description("조회할 산책방 ID, 생략하면 전체 방 조회").optional(),
                                parameterWithName("page").description("페이지 번호"),
                                parameterWithName("size").description("페이지 크기")
                        ),
                        responseFields(
                                fieldWithPath("content[].walkSessionId").description("산책 세션 ID"),
                                fieldWithPath("content[].roomId").description("산책방 ID"),
                                fieldWithPath("content[].roomName").description("조회 시점 산책방 이름"),
                                fieldWithPath("content[].mode").description("산책방 게임 모드"),
                                fieldWithPath("content[].startedAt").description("UTC 산책 시작 시각"),
                                fieldWithPath("content[].endedAt").description("UTC 산책 종료 시각"),
                                fieldWithPath("content[].durationSeconds").description("산책 지속 시간(초)"),
                                fieldWithPath("content[].step").description("걸음 수"),
                                fieldWithPath("content[].distance").description("거리"),
                                fieldWithPath("content[].calories").description("소모 칼로리"),
                                fieldWithPath("content[].initialBingoBoardId").description("시작 당시 빙고판 ID").optional(),
                                fieldWithPath("content[].achievedMissionCount").description("이번 세션에서 승인된 미션 수"),
                                fieldWithPath("hasNext").description("다음 Slice 존재 여부")
                        )
                ));
    }

    @Test
    @DisplayName("방 ID를 지정하면 해당 방의 산책 세션 목록을 반환한다")
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
    @DisplayName("산책 세션 상세에 빙고판과 세션 달성 셀을 반환한다")
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
                                parameterWithName("walkSessionId").description("조회할 산책 세션 ID")
                        ),
                        responseFields(
                                fieldWithPath("walkSessionId").description("산책 세션 ID"),
                                fieldWithPath("roomId").description("산책방 ID"),
                                fieldWithPath("roomName").description("조회 시점 산책방 이름"),
                                fieldWithPath("mode").description("산책방 게임 모드"),
                                fieldWithPath("startedAt").description("UTC 산책 시작 시각"),
                                fieldWithPath("endedAt").description("UTC 산책 종료 시각"),
                                fieldWithPath("durationSeconds").description("산책 지속 시간(초)"),
                                fieldWithPath("step").description("걸음 수"),
                                fieldWithPath("distance").description("거리"),
                                fieldWithPath("calories").description("소모 칼로리"),
                                fieldWithPath("initialBingoBoardId").description("시작 당시 빙고판 ID").optional(),
                                fieldWithPath("achievedMissionCount").description("이번 세션에서 승인된 미션 수"),
                                fieldWithPath("bingoBoards[].bingoBoardId").description("빙고판 ID"),
                                fieldWithPath("bingoBoards[].gameId").description("게임 회차 ID"),
                                fieldWithPath("bingoBoards[].boardType").description("공유 또는 개인 보드 유형"),
                                fieldWithPath("bingoBoards[].boardSize").description("빙고판 한 변 크기"),
                                fieldWithPath("bingoBoards[].targetBingoCount").description("대결 목표 빙고 수").optional(),
                                fieldWithPath("bingoBoards[].targetStepCount").description("공유 보드 목표 걸음 수").optional(),
                                fieldWithPath("bingoBoards[].status").description("빙고판 상태"),
                                fieldWithPath("bingoBoards[].createdAt").description("빙고판 생성 시각").optional(),
                                fieldWithPath("bingoBoards[].completedAt").description("빙고판 종료 시각").optional(),
                                fieldWithPath("bingoBoards[].cells[].cellId").description("빙고 셀 ID"),
                                fieldWithPath("bingoBoards[].cells[].row").description("행 위치"),
                                fieldWithPath("bingoBoards[].cells[].col").description("열 위치"),
                                fieldWithPath("bingoBoards[].cells[].mission.missionId").description("미션 ID"),
                                fieldWithPath("bingoBoards[].cells[].mission.missionImageUrl").description("미션 이미지 URL"),
                                fieldWithPath("bingoBoards[].cells[].mission.type").description("미션 타입"),
                                fieldWithPath("bingoBoards[].cells[].mission.title").description("미션 제목"),
                                fieldWithPath("bingoBoards[].cells[].mission.detail").description("미션 설명"),
                                fieldWithPath("bingoBoards[].cells[].mission.decisionCondition").description("미션 판정 조건"),
                                fieldWithPath("bingoBoards[].cells[].mission.point").description("미션 승인 보상 포인트"),
                                fieldWithPath("bingoBoards[].cells[].mission.createdAt").description("미션 생성 시각").optional(),
                                fieldWithPath("bingoBoards[].cells[].verificationStatus").description("현재 셀 검증 상태").optional(),
                                fieldWithPath("bingoBoards[].cells[].submittedByMemberId").description("현재 셀 제출자 ID").optional(),
                                fieldWithPath("bingoBoards[].cells[].rejectionReason").description("거절 사유").optional(),
                                fieldWithPath("bingoBoards[].cells[].achievedInSession").description("이번 산책 세션 달성 여부"),
                                fieldWithPath("bingoBoards[].cells[].achievedAt").description("이번 산책 세션 달성 시각").optional()
                        )
                ));
    }

    private WalkSessionResponse summary() {
        return new WalkSessionResponse(
                50L,
                10L,
                "저녁 산책방",
                GameMode.COOPERATE,
                Instant.parse("2026-08-03T01:00:00Z"),
                Instant.parse("2026-08-03T01:42:15Z"),
                2_535L,
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
                "파란 물건 찾기",
                "파란 물건을 촬영하세요.",
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
                summary.step(),
                summary.distance(),
                summary.calories(),
                summary.initialBingoBoardId(),
                summary.achievedMissionCount(),
                List.of(board)
        );
    }

    private org.springframework.restdocs.payload.ResponseFieldsSnippet summaryResponseFields() {
        return responseFields(
                fieldWithPath("walkSessionId").description("산책 세션 ID"),
                fieldWithPath("roomId").description("산책방 ID"),
                fieldWithPath("roomName").description("조회 시점 산책방 이름"),
                fieldWithPath("mode").description("산책방 게임 모드"),
                fieldWithPath("startedAt").description("UTC 산책 시작 시각"),
                fieldWithPath("endedAt").description("UTC 산책 종료 시각"),
                fieldWithPath("durationSeconds").description("산책 지속 시간(초)"),
                fieldWithPath("step").description("걸음 수"),
                fieldWithPath("distance").description("거리"),
                fieldWithPath("calories").description("소모 칼로리"),
                fieldWithPath("initialBingoBoardId").description("시작 당시 빙고판 ID").optional(),
                fieldWithPath("achievedMissionCount").description("이번 세션에서 승인된 미션 수")
        );
    }
}
