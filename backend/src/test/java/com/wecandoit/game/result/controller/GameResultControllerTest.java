package com.wecandoit.game.result.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.game.controller.GameResultController;
import com.wecandoit.game.controller.response.GameResultParticipantResponse;
import com.wecandoit.game.controller.response.GameResultResponse;
import com.wecandoit.game.service.GameResultReadService;
import com.wecandoit.game.domain.GameMode;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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

@DisplayName("게임 결과 조회 API")
@ExtendWith({RestDocumentationExtension.class, MockitoExtension.class})
class GameResultControllerTest {

    @Mock
    private GameResultReadService gameResultReadService;

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new GameResultController(gameResultReadService))
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
    @DisplayName("방 멤버가 완료된 게임의 결과를 조회하면 200 상태와 게임 결과를 반환한다")
    void getGameResultReturnsResult() {
        // given
        given(gameResultReadService.getGameResult(1L, 10L))
                .willReturn(cooperateResultResponse());

        // when & then
        given()
                .when()
                .get("/game-results/{roomId}", 10L)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("gameId", equalTo(100))
                .body("roomId", equalTo(10))
                .body("mode", equalTo("COOPERATE"))
                .body("result", equalTo(true))
                .body("boardSize", equalTo(3))
                .body("targetBingoCount", equalTo(3))
                .body("bingoCount", equalTo(3))
                .body("completedMissionCount", equalTo(5))
                .body("rewardCash", equalTo(200))
                .body("participants[0].memberId", equalTo(1))
                .body("participants[0].nickname", equalTo("host"))
                .body("participants[0].completedMissionCount", equalTo(3))
                .body("participants[0].rewardCash", equalTo(200))
                .body("participants[0].result", equalTo(true))
                .apply(document("game-result-detail",
                        pathParameters(
                                parameterWithName("roomId").description("결과를 조회할 게임방 ID")
                        ),
                        responseFields(
                                fieldWithPath("gameId").description("게임 회차 ID"),
                                fieldWithPath("roomId").description("게임방 ID"),
                                fieldWithPath("mode").description("게임 모드"),
                                fieldWithPath("result").description("완료 결과"),
                                fieldWithPath("boardSize").description("빙고판 한 변의 길이(N x N에서 N)"),
                                fieldWithPath("targetBingoCount").description("목표 빙고 수"),
                                fieldWithPath("bingoCount").description("달성한 빙고 줄 수"),
                                fieldWithPath("completedMissionCount").description("완료한 미션 수 합계"),
                                fieldWithPath("rewardCash").description("게임 완료 기준 보상 캐시"),
                                fieldWithPath("participants[].memberId").description("참여자 ID"),
                                fieldWithPath("participants[].nickname").description("참여자 닉네임"),
                                fieldWithPath("participants[].completedMissionCount")
                                        .description("참여자가 완료한 미션 수"),
                                fieldWithPath("participants[].rewardCash")
                                        .description("참여자에게 지급된 보상 캐시"),
                                fieldWithPath("participants[].result")
                                        .description("참여자 승리 또는 완료 여부")
                        )
                ));
        then(gameResultReadService).should().getGameResult(1L, 10L);
    }

    @Test
    @DisplayName("존재하지 않는 게임방의 결과를 조회하면 404 상태를 반환한다")
    void getGameResultRejectsMissingRoom() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_NOT_FOUND))
                .given(gameResultReadService)
                .getGameResult(1L, 10L);

        // when & then
        assertGameResultErrorResponse(HttpStatus.NOT_FOUND, "game-result-detail-room-not-found");
    }

    @Test
    @DisplayName("게임방 참여자가 아니면 결과 조회에 실패한다")
    void getGameResultRejectsNonMember() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN))
                .given(gameResultReadService)
                .getGameResult(1L, 10L);

        // when & then
        assertGameResultErrorResponse(HttpStatus.FORBIDDEN, "game-result-detail-forbidden");
    }

    @Test
    @DisplayName("완료되지 않은 게임방의 결과를 조회하면 409 상태를 반환한다")
    void getGameResultRejectsNotCompletedRoom() {
        // given
        willThrow(new CustomException(ErrorCode.GAME_NOT_COMPLETED))
                .given(gameResultReadService)
                .getGameResult(1L, 10L);

        // when & then
        assertGameResultErrorResponse(HttpStatus.CONFLICT, "game-result-detail-not-completed");
    }

    @Test
    @DisplayName("내 게임 결과 목록을 조회하면 200 상태와 결과 목록을 반환한다")
    void getMyGameResultsReturnsResults() {
        // given
        SliceResponse<GameResultResponse> response = new SliceResponse<>(
                List.of(cooperateResultResponse()),
                false
        );
        given(gameResultReadService.getMyGameResults(eq(1L), any()))
                .willReturn(response);

        // when & then
        given()
                .when()
                .get("/game-results")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("content[0].gameId", equalTo(100))
                .body("content[0].roomId", equalTo(10))
                .body("content[0].mode", equalTo("COOPERATE"))
                .body("content[0].result", equalTo(true))
                .body("content[0].boardSize", equalTo(3))
                .body("content[0].targetBingoCount", equalTo(3))
                .body("content[0].bingoCount", equalTo(3))
                .body("content[0].completedMissionCount", equalTo(5))
                .body("content[0].rewardCash", equalTo(200))
                .body("hasNext", equalTo(false))
                .apply(document("game-result-list",
                        responseFields(
                                fieldWithPath("content[].gameId").description("게임 회차 ID"),
                                fieldWithPath("content[].roomId").description("게임방 ID"),
                                fieldWithPath("content[].mode").description("게임 모드"),
                                fieldWithPath("content[].result").description("완료 결과"),
                                fieldWithPath("content[].boardSize").description("빙고판 한 변의 길이(N x N에서 N)"),
                                fieldWithPath("content[].targetBingoCount").description("목표 빙고 수"),
                                fieldWithPath("content[].bingoCount").description("달성한 빙고 줄 수"),
                                fieldWithPath("content[].completedMissionCount").description("완료한 미션 수 합계"),
                                fieldWithPath("content[].rewardCash")
                                        .description("게임 완료 기준 보상 캐시"),
                                fieldWithPath("content[].participants[].memberId").description("참여자 ID"),
                                fieldWithPath("content[].participants[].nickname").description("참여자 닉네임"),
                                fieldWithPath("content[].participants[].completedMissionCount")
                                        .description("참여자가 완료한 미션 수"),
                                fieldWithPath("content[].participants[].rewardCash")
                                        .description("참여자에게 지급된 보상 캐시"),
                                fieldWithPath("content[].participants[].result")
                                        .description("참여자 승리 또는 완료 여부"),
                                fieldWithPath("hasNext").description("다음 페이지 존재 여부")
                        )
                ));
    }

    private void assertGameResultErrorResponse(HttpStatus status, String documentName) {
        given()
                .when()
                .get("/game-results/{roomId}", 10L)
                .then()
                .statusCode(status.value())
                .apply(document(documentName,
                        pathParameters(
                                parameterWithName("roomId").description("결과를 조회할 게임방 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
    }

    private GameResultResponse cooperateResultResponse() {
        return new GameResultResponse(
                100L,
                10L,
                GameMode.COOPERATE,
                true,
                3,
                3,
                3,
                5,
                200L,
                List.of(
                        new GameResultParticipantResponse(1L, "host", 3, 200L, true),
                        new GameResultParticipantResponse(2L, "participant", 2, 200L, true)
                )
        );
    }
}
