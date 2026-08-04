package com.wecandoit.game.result.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;
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
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.game.controller.GameResultController;
import com.wecandoit.game.controller.response.GameResultBingoBoardResponse;
import com.wecandoit.game.controller.response.GameResultBingoCellResponse;
import com.wecandoit.game.controller.response.GameResultBoardOwnerResponse;
import com.wecandoit.game.controller.response.GameResultDetailResponse;
import com.wecandoit.game.controller.response.GameResultParticipantResponse;
import com.wecandoit.game.controller.response.GameResultResponse;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.service.GameResultReadService;
import com.wecandoit.avatar.dto.EquippedItemDto;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.mission.controller.response.MissionResponse;
import com.wecandoit.mission.domain.MissionType;
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
    @DisplayName("방 멤버가 완료된 게임 결과를 조회하면 빙고판 기록을 포함한 결과를 반환한다")
    void getGameResultReturnsResult() {
        // given
        given(gameResultReadService.getGameResult(1L, 10L))
                .willReturn(cooperateResultDetailResponse());

        // when & then
        given()
                .when()
                .get("/game-results/{gameId}", 10L)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("gameId", equalTo(100))
                .body("roomId", equalTo(10))
                .body("roomName", equalTo("테스트 방"))
                .body("mode", equalTo("COOPERATE"))
                .body("roomStatus", equalTo("CLOSED"))
                .body("result", equalTo(true))
                .body("boardSize", equalTo(3))
                .body("targetBingoCount", nullValue())
                .body("targetStepCount", equalTo(10000))
                .body("bingoCount", equalTo(3))
                .body("completedMissionCount", equalTo(5))
                .body("rewardPoint", equalTo(200))
                .body("startedAt", equalTo("2026-07-01T10:00:00"))
                .body("completedAt", equalTo("2026-07-08T10:00:00"))
                .body("totalMissionCount", equalTo(2))
                .body("myCompletedMissionCount", equalTo(3))
                .body("myRewardPoint", equalTo(200))
                .body("myResult", equalTo(true))
                .body("participants[0].memberId", equalTo(1))
                .body("participants[0].nickname", equalTo("host"))
                .body("participants[0].gender", equalTo("MALE"))
                .body("participants[0].defaultImageUrl", equalTo("https://example.com/male.png"))
                .body("participants[0].equippedItems[0].itemId", equalTo(100))
                .body("participants[0].completedMissionCount", equalTo(3))
                .body("participants[0].rewardPoint", equalTo(200))
                .body("participants[0].result", equalTo(true))
                .body("bingoBoards[0].bingoBoardId", equalTo(201))
                .body("bingoBoards[0].owners[0].memberId", equalTo(1))
                .body("bingoBoards[0].owners[0].nickname", equalTo("host"))
                .body("bingoBoards[0].boardSize", equalTo(3))
                .body("bingoBoards[0].targetStepCount", equalTo(10000))
                .body("bingoBoards[0].startedAt", equalTo("2026-07-01T10:00:00"))
                .body("bingoBoards[0].completedAt", equalTo("2026-07-08T10:00:00"))
                .body("bingoBoards[0].status", equalTo("COMPLETED"))
                .body("bingoBoards[0].completedBingoCount", equalTo(1))
                .body("bingoBoards[0].totalCellCount", equalTo(2))
                .body("bingoBoards[0].approvedCellCount", equalTo(1))
                .body("bingoBoards[0].cells[0].cellId", equalTo(301))
                .body("bingoBoards[0].cells[0].row", equalTo(0))
                .body("bingoBoards[0].cells[0].col", equalTo(0))
                .body("bingoBoards[0].cells[0].mission.missionId", equalTo(401))
                .body("bingoBoards[0].cells[0].verificationStatus", equalTo("APPROVED"))
                .body("bingoBoards[0].cells[0].submittedByMemberId", equalTo(1))
                .body("bingoBoards[0].cells[0].rejectionReason", equalTo(null))
                .apply(document("game-result-detail",
                        pathParameters(
                                parameterWithName("gameId").description("결과를 조회할 게임 회차 ID")
                        ),
                        responseFields(
                                fieldWithPath("gameId").description("게임 회차 ID"),
                                fieldWithPath("roomId").description("게임방 ID"),
                                fieldWithPath("roomName").description("게임방 이름"),
                                fieldWithPath("mode").description("게임 모드"),
                                fieldWithPath("roomStatus").description("게임방 상태"),
                                fieldWithPath("result").description("완료 결과"),
                                fieldWithPath("boardSize").description("빙고판 한 변 길이"),
                                fieldWithPath("targetBingoCount").optional()
                                        .description("목표 빙고 수(공유 모드는 null, 대결 모드만 사용)"),
                                fieldWithPath("targetStepCount")
                                        .optional()
                                        .description("공유 빙고판 목표 걸음 수. 대결 모드는 null"),
                                fieldWithPath("bingoCount").description("달성한 빙고 수"),
                                fieldWithPath("completedMissionCount").description("완료한 미션 수 합계"),
                                fieldWithPath("rewardPoint").description("게임 완료 기준 보상 포인트"),
                                fieldWithPath("startedAt").description("게임 회차 시작 시각"),
                                fieldWithPath("completedAt").description("게임 회차 종료 시각"),
                                fieldWithPath("totalMissionCount").description("게임 결과 보드의 전체 미션 수"),
                                fieldWithPath("myCompletedMissionCount").description("내 완료 미션 수"),
                                fieldWithPath("myRewardPoint").description("내가 받은 보상 포인트"),
                                fieldWithPath("myResult").description("내 승리 또는 완료 여부"),
                                fieldWithPath("participants[].memberId").description("참여자 ID"),
                                fieldWithPath("participants[].nickname").description("참여자 닉네임"),
                                fieldWithPath("participants[].gender").description("참여자 아바타 성별"),
                                fieldWithPath("participants[].defaultImageUrl")
                                        .optional()
                                        .description("성별 기본 아바타 이미지 URL"),
                                fieldWithPath("participants[].equippedItems").description("현재 장착 아이템 목록"),
                                fieldWithPath("participants[].equippedItems[].memberItemId")
                                        .description("회원 보유 아이템 ID"),
                                fieldWithPath("participants[].equippedItems[].itemId")
                                        .description("원본 아이템 ID"),
                                fieldWithPath("participants[].equippedItems[].name").description("아이템 이름"),
                                fieldWithPath("participants[].equippedItems[].category")
                                        .description("장착 카테고리"),
                                fieldWithPath("participants[].equippedItems[].imageUrl")
                                        .description("아이템 이미지 URL"),
                                fieldWithPath("participants[].completedMissionCount")
                                        .description("참여자가 완료한 미션 수"),
                                fieldWithPath("participants[].rewardPoint")
                                        .description("참여자에게 지급된 보상 포인트"),
                                fieldWithPath("participants[].result")
                                        .description("참여자 승리 또는 완료 여부"),
                                fieldWithPath("bingoBoards[].bingoBoardId").description("빙고판 ID"),
                                fieldWithPath("bingoBoards[].owners[].memberId")
                                        .description("보드 사용자 ID. 공유 보드는 참여자 전원, 개인 보드는 보드 주인 1명"),
                                fieldWithPath("bingoBoards[].owners[].nickname")
                                        .description("보드 사용자 닉네임"),
                                fieldWithPath("bingoBoards[].boardSize").description("빙고판 한 변 길이"),
                                fieldWithPath("bingoBoards[].targetStepCount")
                                        .optional()
                                        .description("해당 보드 목표 걸음 수. 대결 보드는 null"),
                                fieldWithPath("bingoBoards[].startedAt").description("빙고판 생성 시각"),
                                fieldWithPath("bingoBoards[].completedAt")
                                        .optional()
                                        .description("빙고판 완료 시각. 만료 보드는 null"),
                                fieldWithPath("bingoBoards[].status").description("빙고판 상태"),
                                fieldWithPath("bingoBoards[].completedBingoCount")
                                        .description("완성된 빙고 줄 수"),
                                fieldWithPath("bingoBoards[].totalCellCount").description("빙고 칸 전체 수"),
                                fieldWithPath("bingoBoards[].approvedCellCount").description("승인된 빙고 칸 수"),
                                fieldWithPath("bingoBoards[].cells[].cellId").description("빙고 칸 ID"),
                                fieldWithPath("bingoBoards[].cells[].row").description("빙고 칸 행 위치"),
                                fieldWithPath("bingoBoards[].cells[].col").description("빙고 칸 열 위치"),
                                fieldWithPath("bingoBoards[].cells[].mission.missionId").description("미션 ID"),
                                fieldWithPath("bingoBoards[].cells[].mission.missionImageUrl")
                                        .description("미션 이미지 URL"),
                                fieldWithPath("bingoBoards[].cells[].mission.type").description("미션 유형"),
                                fieldWithPath("bingoBoards[].cells[].mission.title").description("미션 제목"),
                                fieldWithPath("bingoBoards[].cells[].mission.detail").description("미션 설명"),
                                fieldWithPath("bingoBoards[].cells[].mission.decisionCondition")
                                        .description("미션 판단 조건"),
                                fieldWithPath("bingoBoards[].cells[].mission.point")
                                        .description("미션 완료 시 지급되는 포인트"),
                                fieldWithPath("bingoBoards[].cells[].mission.createdAt").description("미션 생성 시각"),
                                fieldWithPath("bingoBoards[].cells[].verificationStatus")
                                        .optional()
                                        .description("빙고 칸 검증 상태"),
                                fieldWithPath("bingoBoards[].cells[].submittedByMemberId")
                                        .optional()
                                        .description("해당 칸을 제출한 참여자 ID"),
                                fieldWithPath("bingoBoards[].cells[].rejectionReason")
                                        .optional()
                                        .description("검증 거절 사유")
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
                .body("content[0].roomName", equalTo("테스트 방"))
                .body("content[0].mode", equalTo("COOPERATE"))
                .body("content[0].roomStatus", equalTo("CLOSED"))
                .body("content[0].result", equalTo(true))
                .body("content[0].boardSize", equalTo(3))
                .body("content[0].targetBingoCount", nullValue())
                .body("content[0].targetStepCount", equalTo(10000))
                .body("content[0].bingoCount", equalTo(3))
                .body("content[0].completedMissionCount", equalTo(5))
                .body("content[0].rewardPoint", equalTo(200))
                .body("content[0].startedAt", equalTo("2026-07-01T10:00:00"))
                .body("content[0].completedAt", equalTo("2026-07-08T10:00:00"))
                .body("content[0].totalMissionCount", equalTo(2))
                .body("content[0].myCompletedMissionCount", equalTo(3))
                .body("content[0].myRewardPoint", equalTo(200))
                .body("content[0].myResult", equalTo(true))
                .body("content[0].participants[0].gender", equalTo("MALE"))
                .body("content[0].participants[0].defaultImageUrl", equalTo("https://example.com/male.png"))
                .body("content[0].participants[0].equippedItems[0].itemId", equalTo(100))
                .body("hasNext", equalTo(false))
                .apply(document("game-result-list",
                        responseFields(
                                fieldWithPath("content[].gameId").description("게임 회차 ID"),
                                fieldWithPath("content[].roomId").description("게임방 ID"),
                                fieldWithPath("content[].roomName").description("게임방 이름"),
                                fieldWithPath("content[].mode").description("게임 모드"),
                                fieldWithPath("content[].roomStatus").description("게임방 상태"),
                                fieldWithPath("content[].result").description("완료 결과"),
                                fieldWithPath("content[].boardSize").description("빙고판 한 변 길이"),
                                fieldWithPath("content[].targetBingoCount").optional()
                                        .description("목표 빙고 수(공유 모드는 null, 대결 모드만 사용)"),
                                fieldWithPath("content[].targetStepCount")
                                        .optional()
                                        .description("공유 빙고판 목표 걸음 수. 대결 모드는 null"),
                                fieldWithPath("content[].bingoCount").description("달성한 빙고 수"),
                                fieldWithPath("content[].completedMissionCount").description("완료한 미션 수 합계"),
                                fieldWithPath("content[].rewardPoint")
                                        .description("게임 완료 기준 보상 포인트"),
                                fieldWithPath("content[].startedAt").description("게임 회차 시작 시각"),
                                fieldWithPath("content[].completedAt").description("게임 회차 종료 시각"),
                                fieldWithPath("content[].totalMissionCount").description("게임 결과 보드의 전체 미션 수"),
                                fieldWithPath("content[].myCompletedMissionCount").description("내 완료 미션 수"),
                                fieldWithPath("content[].myRewardPoint").description("내가 받은 보상 포인트"),
                                fieldWithPath("content[].myResult").description("내 승리 또는 완료 여부"),
                                fieldWithPath("content[].participants[].memberId").description("참여자 ID"),
                                fieldWithPath("content[].participants[].nickname").description("참여자 닉네임"),
                                fieldWithPath("content[].participants[].gender")
                                        .description("참여자 아바타 성별"),
                                fieldWithPath("content[].participants[].defaultImageUrl")
                                        .optional()
                                        .description("성별 기본 아바타 이미지 URL"),
                                fieldWithPath("content[].participants[].equippedItems")
                                        .description("현재 장착 아이템 목록"),
                                fieldWithPath("content[].participants[].equippedItems[].memberItemId")
                                        .description("회원 보유 아이템 ID"),
                                fieldWithPath("content[].participants[].equippedItems[].itemId")
                                        .description("원본 아이템 ID"),
                                fieldWithPath("content[].participants[].equippedItems[].name")
                                        .description("아이템 이름"),
                                fieldWithPath("content[].participants[].equippedItems[].category")
                                        .description("장착 카테고리"),
                                fieldWithPath("content[].participants[].equippedItems[].imageUrl")
                                        .description("아이템 이미지 URL"),
                                fieldWithPath("content[].participants[].completedMissionCount")
                                        .description("참여자가 완료한 미션 수"),
                                fieldWithPath("content[].participants[].rewardPoint")
                                        .description("참여자에게 지급된 보상 포인트"),
                                fieldWithPath("content[].participants[].result")
                                        .description("참여자 승리 또는 완료 여부"),
                                fieldWithPath("hasNext").description("다음 페이지 존재 여부")
                        )
                ));
    }

    private void assertGameResultErrorResponse(HttpStatus status, String documentName) {
        given()
                .when()
                .get("/game-results/{gameId}", 10L)
                .then()
                .statusCode(status.value())
                .apply(document(documentName,
                        pathParameters(
                                parameterWithName("gameId").description("결과를 조회할 게임 회차 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
    }

    private GameResultDetailResponse cooperateResultDetailResponse() {
        return new GameResultDetailResponse(
                100L,
                10L,
                "테스트 방",
                GameMode.COOPERATE,
                RoomStatus.CLOSED,
                true,
                3,
                null,
                10_000,
                3,
                5,
                200L,
                LocalDateTime.of(2026, 7, 1, 10, 0),
                LocalDateTime.of(2026, 7, 8, 10, 0),
                2,
                3,
                200L,
                true,
                participantResponses(),
                List.of(new GameResultBingoBoardResponse(
                        201L,
                        List.of(
                                new GameResultBoardOwnerResponse(1L, "host"),
                                new GameResultBoardOwnerResponse(2L, "participant")
                        ),
                        3,
                        10_000,
                        LocalDateTime.of(2026, 7, 1, 10, 0),
                        LocalDateTime.of(2026, 7, 8, 10, 0),
                        BingoBoardStatus.COMPLETED,
                        1,
                        2,
                        1,
                        List.of(
                                new GameResultBingoCellResponse(
                                        301L,
                                        0,
                                        0,
                                        missionResponse(401L),
                                        BingoCellVerificationStatus.APPROVED,
                                        1L,
                                        null
                                ),
                                new GameResultBingoCellResponse(
                                        302L,
                                        0,
                                        1,
                                        missionResponse(402L),
                                        null,
                                        null,
                                        null
                                )
                        )
                ))
        );
    }

    private GameResultResponse cooperateResultResponse() {
        return new GameResultResponse(
                100L,
                10L,
                "테스트 방",
                GameMode.COOPERATE,
                RoomStatus.CLOSED,
                true,
                3,
                null,
                10_000,
                3,
                5,
                200L,
                LocalDateTime.of(2026, 7, 1, 10, 0),
                LocalDateTime.of(2026, 7, 8, 10, 0),
                2,
                3,
                200L,
                true,
                participantResponses()
        );
    }

    private List<GameResultParticipantResponse> participantResponses() {
        EquippedItemDto equippedItem = new EquippedItemDto(
                10L,
                100L,
                "빨간 모자",
                ItemCategory.HAT,
                "https://example.com/hat.png"
        );
        return List.of(
                new GameResultParticipantResponse(
                        1L,
                        "host",
                        Gender.MALE,
                        "https://example.com/male.png",
                        List.of(equippedItem),
                        3,
                        200L,
                        true
                ),
                new GameResultParticipantResponse(
                        2L,
                        "participant",
                        Gender.FEMALE,
                        "https://example.com/female.png",
                        List.of(),
                        2,
                        200L,
                        true
                )
        );
    }

    private MissionResponse missionResponse(Long missionId) {
        return new MissionResponse(
                missionId,
                "https://example.com/mission.png",
                MissionType.OBJECT,
                "미션",
                "설명",
                null,
                50L,
                LocalDateTime.of(2026, 7, 29, 12, 0)
        );
    }
}
