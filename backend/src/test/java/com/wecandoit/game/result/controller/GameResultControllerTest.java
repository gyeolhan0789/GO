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
import com.wecandoit.game.result.controller.response.GameResultResponse;
import com.wecandoit.game.result.service.GameResultReadService;
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
                .willReturn(new GameResultResponse(10L, true, 3, 9, 500L));

        // when & then
        given()
                .when()
                .get("/game-results/{roomId}", 10L)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("roomId", equalTo(10))
                .body("result", equalTo(true))
                .body("bingoCount", equalTo(3))
                .body("completedMissionCount", equalTo(9))
                .body("rewardCash", equalTo(500))
                .apply(document("game-result-detail",
                        pathParameters(
                                parameterWithName("roomId").description("결과를 조회할 게임방 ID")
                        ),
                        responseFields(
                                fieldWithPath("roomId").description("게임방 ID"),
                                fieldWithPath("result").description("승리 여부"),
                                fieldWithPath("bingoCount").description("달성한 빙고 줄 수"),
                                fieldWithPath("completedMissionCount").description("완료한 미션 수 합계"),
                                fieldWithPath("rewardCash").description("지급된 보상 캐시")
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
                List.of(new GameResultResponse(10L, true, 3, 9, 500L)),
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
                .body("content[0].roomId", equalTo(10))
                .body("content[0].result", equalTo(true))
                .body("content[0].bingoCount", equalTo(3))
                .body("content[0].completedMissionCount", equalTo(9))
                .body("content[0].rewardCash", equalTo(500))
                .body("hasNext", equalTo(false))
                .apply(document("game-result-list",
                        responseFields(
                                fieldWithPath("content[].roomId").description("게임방 ID"),
                                fieldWithPath("content[].result").description("승리 여부"),
                                fieldWithPath("content[].bingoCount").description("달성한 빙고 줄 수"),
                                fieldWithPath("content[].completedMissionCount").description("완료한 미션 수 합계"),
                                fieldWithPath("content[].rewardCash").description("지급된 보상 캐시"),
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
}
