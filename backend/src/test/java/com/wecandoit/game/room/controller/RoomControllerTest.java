package com.wecandoit.game.room.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.common.status.RequestStatus;
import com.wecandoit.game.controller.RoomController;
import com.wecandoit.game.controller.request.CreateRoomRequest;
import com.wecandoit.game.controller.request.GameRequestCreateRequest;
import com.wecandoit.game.controller.request.UpdateRoomNameRequest;
import com.wecandoit.game.controller.response.GameRequestCreateResponse;
import com.wecandoit.game.controller.response.MyRoomMemberResponse;
import com.wecandoit.game.controller.response.MyRoomResponse;
import com.wecandoit.game.controller.response.ReceivedGameRequestResponse;
import com.wecandoit.game.controller.response.RoomDetailResponse;
import com.wecandoit.game.controller.response.RoomMemberResponse;
import com.wecandoit.game.controller.response.SentGameRequestResponse;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.service.GameRequestCommandService;
import com.wecandoit.game.service.GameRequestReadService;
import com.wecandoit.game.service.RoomCommandService;
import com.wecandoit.game.service.RoomCreateFacade;
import com.wecandoit.game.service.RoomReadService;
import com.wecandoit.avatar.dto.EquippedItemDto;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.member.domain.Gender;
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
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.restdocs.RestDocumentationContextProvider;
import org.springframework.restdocs.RestDocumentationExtension;
import org.springframework.restdocs.payload.FieldDescriptor;
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("게임방 API")
@ExtendWith({RestDocumentationExtension.class, MockitoExtension.class})
class RoomControllerTest {

    private static final String ACCEPT_ACTION = "accept";
    private static final String REJECT_ACTION = "reject";
    private static final String CANCEL_ACTION = "cancel";

    @Mock
    private RoomCommandService roomCommandService;

    @Mock
    private RoomReadService roomReadService;

    @Mock
    private RoomCreateFacade roomCreateFacade;

    @Mock
    private GameRequestCommandService gameRequestCommandService;

    @Mock
    private GameRequestReadService gameRequestReadService;

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(
                        new RoomController(
                                roomCommandService,
                                roomReadService,
                                roomCreateFacade,
                                gameRequestCommandService,
                                gameRequestReadService))
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
    @DisplayName("공유 게임방을 생성하면 첫 회차가 반영된 방 상세를 반환한다")
    void createRoomReturnsRoomDetail() {
        CreateRoomRequest request =
                new CreateRoomRequest("주간 운동", GameMode.COOPERATE, null, 12_000, 4);
        RoomDetailResponse response = roomDetailResponse();
        given(roomCreateFacade.createRoom(1L, request)).willReturn(response);

        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "name": "주간 운동",
                          "mode": "COOPERATE",
                          "targetStepCount": 12000,
                          "boardSize": 4
                        }
                        """)
                .when()
                .post("/rooms")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("status", equalTo("ACTIVE"))
                .body("boardSize", equalTo(4))
                .body("targetBingoCount", nullValue())
                .body("targetStepCount", equalTo(12_000))
                .apply(document("room-create",
                        requestFields(
                                fieldWithPath("name").description("게임방 이름"),
                                fieldWithPath("mode").description("게임 모드"),
                                fieldWithPath("targetBingoCount").optional()
                                        .type(JsonFieldType.NUMBER)
                                        .description("목표 빙고 수(BATTLE만 필수, 공유 모드는 생략 또는 null)"),
                                fieldWithPath("targetStepCount").description("첫 회차 목표 걸음 수"),
                                fieldWithPath("boardSize").description("첫 회차 빙고판 크기")
                        ),
                        responseFields(roomDetailFields())
                ));

        then(roomCreateFacade).should().createRoom(1L, request);
    }

    @Test
    @DisplayName("공유 모드는 전달된 목표 빙고 수를 검증하지 않는다")
    void createSharedRoomIgnoresLegacyTargetBingoCount() {
        CreateRoomRequest request =
                new CreateRoomRequest("주간 운동", GameMode.COOPERATE, 0, 12_000, 4);
        given(roomCreateFacade.createRoom(1L, request)).willReturn(roomDetailResponse());

        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "name": "주간 운동",
                          "mode": "COOPERATE",
                          "targetBingoCount": 0,
                          "targetStepCount": 12000,
                          "boardSize": 4
                        }
                        """)
                .when()
                .post("/rooms")
                .then()
                .statusCode(HttpStatus.OK.value());

        then(roomCreateFacade).should().createRoom(1L, request);
    }

    @Test
    @DisplayName("모드 필터로 내가 참여 중인 활성 방을 조회한다")
    void getMyRoomsFiltersByMode() {
        given(roomReadService.getMyRooms(1L, GameMode.COOPERATE))
                .willReturn(List.of(myRoomResponse()));

        given()
                .queryParam("mode", "COOPERATE")
                .when()
                .get("/rooms")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("[0].status", equalTo("ACTIVE"))
                .body("[0].boardSize", equalTo(4))
                .body("[0].members[0].gender", equalTo("MALE"))
                .body("[0].members[0].defaultImageUrl", equalTo("https://example.com/male.png"))
                .body("[0].members[0].equippedItems[0].itemId", equalTo(100))
                .apply(document("room-list",
                        queryParameters(
                                parameterWithName("mode")
                                        .description("게임 모드 필터, 생략하면 전체")
                                        .optional()
                        ),
                        responseFields(
                                fieldWithPath("[].roomId").description("게임방 ID"),
                                fieldWithPath("[].name").description("게임방 이름"),
                                fieldWithPath("[].mode").description("게임 모드"),
                                fieldWithPath("[].status").description("방 상태(ACTIVE, CLOSED)"),
                                fieldWithPath("[].boardSize").description("현재 또는 최신 빙고판 크기"),
                                fieldWithPath("[].targetBingoCount").optional()
                                        .description("목표 빙고 수(공유 모드는 null, 대결 모드만 사용)"),
                                fieldWithPath("[].targetStepCount").description("현재 또는 최신 목표 걸음 수"),
                                fieldWithPath("[].totalMissionCount").description("현재 또는 최신 전체 미션 수"),
                                fieldWithPath("[].completedMissionCount").description("완료 미션 수"),
                                fieldWithPath("[].hostId").description("방장 회원 ID"),
                                fieldWithPath("[].joinedAt").description("현재 방 참여 시각"),
                                fieldWithPath("[].members[].memberId").description("현재 방 회원 ID"),
                                fieldWithPath("[].members[].nickname").description("현재 방 회원 닉네임"),
                                fieldWithPath("[].members[].gender").description("회원 아바타 성별"),
                                fieldWithPath("[].members[].defaultImageUrl")
                                        .optional()
                                        .description("성별 기본 아바타 이미지 URL"),
                                fieldWithPath("[].members[].equippedItems").description("현재 장착 아이템 목록"),
                                fieldWithPath("[].members[].equippedItems[].memberItemId")
                                        .description("회원 보유 아이템 ID"),
                                fieldWithPath("[].members[].equippedItems[].itemId")
                                        .description("원본 아이템 ID"),
                                fieldWithPath("[].members[].equippedItems[].name").description("아이템 이름"),
                                fieldWithPath("[].members[].equippedItems[].category")
                                        .description("장착 카테고리"),
                                fieldWithPath("[].members[].equippedItems[].imageUrl")
                                        .description("아이템 이미지 URL"),
                                fieldWithPath("[].members[].host").description("방장 여부")
                        )
                ));
    }

    @Test
    @DisplayName("활성 게임방 상세를 조회한다")
    void getRoomDetailReturnsCurrentCycleSettings() {
        given(roomReadService.getRoomDetail(1L, 10L)).willReturn(roomDetailResponse());

        given()
                .when()
                .get("/rooms/{roomId}", 10L)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("startedAt", equalTo("2026-07-31T09:00:00"))
                .body("members[0].gender", equalTo("MALE"))
                .body("members[0].defaultImageUrl", equalTo("https://example.com/male.png"))
                .body("members[0].equippedItems[0].itemId", equalTo(100))
                .apply(document("room-detail",
                        pathParameters(
                                parameterWithName("roomId").description("게임방 ID")
                        ),
                        responseFields(roomDetailFields())
                ));
    }

    @Test
    @DisplayName("게임방 멤버 목록에 현재 아바타 정보를 반환한다")
    void getRoomMembersReturnsAvatars() {
        // given
        given(roomReadService.getRoomMembers(1L, 10L))
                .willReturn(roomDetailResponse().members());

        // when & then
        given()
                .when()
                .get("/rooms/{roomId}/members", 10L)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("[0].memberId", equalTo(1))
                .body("[0].gender", equalTo("MALE"))
                .body("[0].defaultImageUrl", equalTo("https://example.com/male.png"))
                .body("[0].equippedItems[0].itemId", equalTo(100))
                .apply(document("room-members",
                        pathParameters(
                                parameterWithName("roomId").description("게임방 ID")
                        ),
                        responseFields(
                                fieldWithPath("[].memberId").description("현재 방 회원 ID"),
                                fieldWithPath("[].nickname").description("현재 방 회원 닉네임"),
                                fieldWithPath("[].gender").description("회원 아바타 성별"),
                                fieldWithPath("[].defaultImageUrl")
                                        .optional()
                                        .description("성별 기본 아바타 이미지 URL"),
                                fieldWithPath("[].equippedItems").description("현재 장착 아이템 목록"),
                                fieldWithPath("[].equippedItems[].memberItemId")
                                        .description("회원 보유 아이템 ID"),
                                fieldWithPath("[].equippedItems[].itemId").description("원본 아이템 ID"),
                                fieldWithPath("[].equippedItems[].name").description("아이템 이름"),
                                fieldWithPath("[].equippedItems[].category").description("장착 카테고리"),
                                fieldWithPath("[].equippedItems[].imageUrl").description("아이템 이미지 URL"),
                                fieldWithPath("[].host").description("방장 여부"),
                                fieldWithPath("[].completedMissionCount").description("현재 회차 완료 미션 수"),
                                fieldWithPath("[].joinedAt").description("현재 방 참여 시각"),
                                fieldWithPath("[].bingoBoardId")
                                        .optional()
                                        .description("대결 개인 빙고판 ID")
                        )
                ));
        then(roomReadService).should().getRoomMembers(1L, 10L);
    }

    @Test
    @DisplayName("방장이 게임방 이름을 변경한다")
    void updateRoomNameReturnsNoContent() {
        UpdateRoomNameRequest request = new UpdateRoomNameRequest("새 이름");

        given()
                .contentType(ContentType.JSON)
                .body("{\"name\":\"새 이름\"}")
                .when()
                .patch("/rooms/{roomId}", 10L)
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value())
                .apply(document("room-update-name",
                        pathParameters(
                                parameterWithName("roomId").description("게임방 ID")
                        ),
                        requestFields(
                                fieldWithPath("name").description("변경할 게임방 이름")
                        )
                ));

        then(roomCommandService).should().updateRoomName(1L, 10L, request);
    }

    @Test
    @DisplayName("현재 게임방에서 나간다")
    void leaveRoomReturnsNoContent() {
        given()
                .when()
                .delete("/rooms/{roomId}/members/me", 10L)
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value())
                .apply(document("room-leave",
                        pathParameters(
                                parameterWithName("roomId").description("나갈 게임방 ID")
                        )
                ));

        then(roomCommandService).should().leaveRoom(1L, 10L);
    }

    @Test
    @DisplayName("받은 게임방 초대 요청 목록을 조회하면 200 상태와 대기 중 초대 목록을 반환한다")
    void getReceivedGameRequestsReturnsPendingRequests() {
        // given
        LocalDateTime createdAt = LocalDateTime.of(2026, 7, 22, 10, 0);
        given(gameRequestReadService.getReceivedGameRequests(1L))
                .willReturn(List.of(new ReceivedGameRequestResponse(
                        20L,
                        10L,
                        2L,
                        "초대자",
                        RequestStatus.PENDING,
                        createdAt
                )));

        // when & then
        given()
                .when()
                .get("/rooms/requests/received")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("[0].requestId", equalTo(20))
                .body("[0].roomId", equalTo(10))
                .body("[0].inviterId", equalTo(2))
                .body("[0].inviterNickname", equalTo("초대자"))
                .body("[0].status", equalTo("PENDING"))
                .body("[0].createdAt", equalTo("2026-07-22T10:00:00"))
                .apply(document("game-request-received-list",
                        responseFields(
                                fieldWithPath("[].requestId").description("게임방 초대 요청 ID"),
                                fieldWithPath("[].roomId").description("초대받은 게임방 ID"),
                                fieldWithPath("[].inviterId").description("초대한 회원 ID"),
                                fieldWithPath("[].inviterNickname").description("초대한 회원 닉네임"),
                                fieldWithPath("[].status").description("게임방 초대 요청 상태"),
                                fieldWithPath("[].createdAt").description("게임방 초대 요청 생성 시각")
                        )
                ));
        then(gameRequestReadService).should().getReceivedGameRequests(1L);
    }

    @Test
    @DisplayName("보낸 게임방 초대 요청 목록을 조회하면 200 상태와 대기 중 초대 목록을 반환한다")
    void getSentGameRequestsReturnsPendingRequests() {
        // given
        LocalDateTime createdAt = LocalDateTime.of(2026, 7, 22, 10, 0);
        given(gameRequestReadService.getSentGameRequests(1L))
                .willReturn(List.of(new SentGameRequestResponse(
                        20L,
                        10L,
                        2L,
                        "초대받은사람",
                        RequestStatus.PENDING,
                        createdAt
                )));

        // when & then
        given()
                .when()
                .get("/rooms/requests/sent")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("[0].requestId", equalTo(20))
                .body("[0].roomId", equalTo(10))
                .body("[0].inviteeId", equalTo(2))
                .body("[0].inviteeNickname", equalTo("초대받은사람"))
                .body("[0].status", equalTo("PENDING"))
                .body("[0].createdAt", equalTo("2026-07-22T10:00:00"))
                .apply(document("game-request-sent-list",
                        responseFields(
                                fieldWithPath("[].requestId").description("게임방 초대 요청 ID"),
                                fieldWithPath("[].roomId").description("초대한 게임방 ID"),
                                fieldWithPath("[].inviteeId").description("초대받은 회원 ID"),
                                fieldWithPath("[].inviteeNickname").description("초대받은 회원 닉네임"),
                                fieldWithPath("[].status").description("게임방 초대 요청 상태"),
                                fieldWithPath("[].createdAt").description("게임방 초대 요청 생성 시각")
                        )
                ));
        then(gameRequestReadService).should().getSentGameRequests(1L);
    }

    @Test
    @DisplayName("친구 초대 요청을 생성하면 201 상태와 생성 결과를 반환한다")
    void createGameRequestReturnsCreatedRequest() {
        // given
        GameRequestCreateRequest request = new GameRequestCreateRequest(2L);
        given(gameRequestCommandService.createGameRequest(1L, 10L, request))
                .willReturn(new GameRequestCreateResponse(20L, RequestStatus.PENDING, true));

        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "inviteeId": 2
                        }
                        """)
                .when()
                .post("/rooms/{roomId}/requests", 10L)
                .then()
                .statusCode(HttpStatus.CREATED.value())
                .body("requestId", equalTo(20))
                .body("status", equalTo("PENDING"))
                .body("created", equalTo(true))
                .apply(document("game-request-create",
                        pathParameters(
                                parameterWithName("roomId")
                                        .description("초대할 게임방 ID. BATTLE 방 초대도 WebSocket 접속 여부와 무관하게 생성된다.")
                        ),
                        requestFields(
                                fieldWithPath("inviteeId").description("초대받을 친구 회원 ID")
                        ),
                        responseFields(
                                fieldWithPath("requestId").description("게임방 초대 요청 ID"),
                                fieldWithPath("status").description("게임방 초대 요청 상태"),
                                fieldWithPath("created")
                                        .description("신규 생성 여부. true이면 초대 알림이 발행되며, BATTLE 초대도 WebSocket 초대 수신 이벤트는 발행하지 않는다.")
                        )
                ));
        then(gameRequestCommandService).should().createGameRequest(1L, 10L, request);
    }

    @Test
    @DisplayName("동일한 대기 중 초대가 있으면 200 상태와 기존 요청을 반환한다")
    void createGameRequestReturnsExistingRequest() {
        // given
        GameRequestCreateRequest request = new GameRequestCreateRequest(2L);
        given(gameRequestCommandService.createGameRequest(1L, 10L, request))
                .willReturn(new GameRequestCreateResponse(20L, RequestStatus.PENDING, false));

        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "inviteeId": 2
                        }
                        """)
                .when()
                .post("/rooms/{roomId}/requests", 10L)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("requestId", equalTo(20))
                .body("status", equalTo("PENDING"))
                .body("created", equalTo(false))
                .apply(document("game-request-existing",
                        pathParameters(
                                parameterWithName("roomId")
                                        .description("초대할 게임방 ID. 같은 방과 같은 invitee의 PENDING 요청이 있으면 기존 요청을 반환한다.")
                        ),
                        requestFields(
                                fieldWithPath("inviteeId").description("초대받을 친구 회원 ID")
                        ),
                        responseFields(
                                fieldWithPath("requestId").description("기존 게임방 초대 요청 ID"),
                                fieldWithPath("status").description("게임방 초대 요청 상태"),
                                fieldWithPath("created")
                                        .description("신규 생성 여부. false이면 새 row와 초대 알림을 만들지 않는다.")
                        )
                ));
        then(gameRequestCommandService).should().createGameRequest(1L, 10L, request);
    }

    @Test
    @DisplayName("초대할 회원 ID가 없으면 400 상태를 반환한다")
    void createGameRequestRejectsMissingInviteeId() {
        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("{}")
                .when()
                .post("/rooms/{roomId}/requests", 10L)
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .apply(document("game-request-invalid-missing-invitee",
                        pathParameters(
                                parameterWithName("roomId").description("초대할 게임방 ID")
                        ),
                        requestFields(),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
        then(gameRequestCommandService).should(never()).createGameRequest(
                Mockito.anyLong(),
                Mockito.anyLong(),
                Mockito.any()
        );
    }

    @Test
    @DisplayName("초대할 회원 ID가 양수가 아니면 400 상태를 반환한다")
    void createGameRequestRejectsInvalidInviteeId() {
        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "inviteeId": 0
                        }
                        """)
                .when()
                .post("/rooms/{roomId}/requests", 10L)
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        then(gameRequestCommandService).should(never()).createGameRequest(
                Mockito.anyLong(),
                Mockito.anyLong(),
                Mockito.any()
        );
    }

    @Test
    @DisplayName("존재하지 않는 게임방에 초대하면 404 상태를 반환한다")
    void createGameRequestRejectsMissingRoom() {
        assertErrorResponse(ErrorCode.ROOM_NOT_FOUND, "game-request-room-not-found");
    }

    @Test
    @DisplayName("게임방 참여자가 아니면 403 상태를 반환한다")
    void createGameRequestRejectsNonMemberInviter() {
        assertErrorResponse(ErrorCode.GAME_REQUEST_FORBIDDEN, "game-request-forbidden");
    }

    @Test
    @DisplayName("초대할 수 없는 게임방 상태이면 409 상태를 반환한다")
    void createGameRequestRejectsUnavailableRoom() {
        assertErrorResponse(ErrorCode.GAME_REQUEST_NOT_AVAILABLE, "game-request-not-available");
    }

    @Test
    @DisplayName("게임방 초대 요청을 수락하면 204 상태를 반환한다")
    void acceptGameRequestReturnsNoContent() {
        // when & then
        given()
                .when()
                .patch("/rooms/{roomId}/requests/{requestId}/accept", 10L, 20L)
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value())
                .apply(document("game-request-accept",
                        pathParameters(
                                parameterWithName("roomId")
                                        .description("초대를 수락할 게임방 ID. BATTLE 방은 수락 전에 `/ws` 연결과 `/user/queue/battle` 구독을 완료해야 한다."),
                                parameterWithName("requestId")
                                        .description("수락할 게임방 초대 요청 ID. BATTLE 수락 성공 후 양쪽 개인 큐로 `BATTLE_COUNTDOWN_STARTED`가 전송된다.")
                        )
                ));
        then(gameRequestCommandService).should().acceptGameRequest(1L, 10L, 20L);
    }

    @Test
    @DisplayName("게임방 초대 요청을 거절하면 204 상태를 반환한다")
    void rejectGameRequestReturnsNoContent() {
        // when & then
        given()
                .when()
                .patch("/rooms/{roomId}/requests/{requestId}/reject", 10L, 20L)
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value())
                .apply(document("game-request-reject",
                        pathParameters(
                                parameterWithName("roomId")
                                        .description("초대를 거절할 게임방 ID. BATTLE 방이면 초대한 회원에게 `INVITATION_REJECTED`가 전송된다."),
                                parameterWithName("requestId").description("거절할 게임방 초대 요청 ID")
                        )
                ));
        then(gameRequestCommandService).should().rejectGameRequest(1L, 10L, 20L);
    }

    @Test
    @DisplayName("보낸 게임방 초대 요청을 취소하면 204 상태를 반환한다")
    void cancelGameRequestReturnsNoContent() {
        // when & then
        given()
                .when()
                .patch("/rooms/{roomId}/requests/{requestId}/cancel", 10L, 20L)
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value())
                .apply(document("game-request-cancel",
                        pathParameters(
                                parameterWithName("roomId")
                                        .description("초대를 취소할 게임방 ID. BATTLE 방이면 초대 대상에게 `INVITATION_CANCELLED`가 전송된다."),
                                parameterWithName("requestId").description("취소할 게임방 초대 요청 ID")
                        )
                ));
        then(gameRequestCommandService).should().cancelGameRequest(1L, 10L, 20L);
    }

    @Test
    @DisplayName("존재하지 않는 게임방 초대 요청을 수락하면 404 상태를 반환한다")
    void acceptGameRequestRejectsMissingRequest() {
        assertProcessErrorResponse(ErrorCode.GAME_REQUEST_NOT_FOUND, "game-request-accept-not-found", ACCEPT_ACTION);
    }

    @Test
    @DisplayName("초대받은 회원이 아니면 게임방 초대 요청을 수락할 수 없다")
    void acceptGameRequestRejectsForbiddenMember() {
        assertProcessErrorResponse(ErrorCode.GAME_REQUEST_FORBIDDEN, "game-request-accept-forbidden", ACCEPT_ACTION);
    }

    @Test
    @DisplayName("이미 처리된 게임방 초대 요청을 수락하면 409 상태를 반환한다")
    void acceptGameRequestRejectsProcessedRequest() {
        assertProcessErrorResponse(
                ErrorCode.GAME_REQUEST_ALREADY_PROCESSED,
                "game-request-accept-processed",
                ACCEPT_ACTION
        );
    }

    @Test
    @DisplayName("존재하지 않는 게임방 초대 요청을 거절하면 404 상태를 반환한다")
    void rejectGameRequestRejectsMissingRequest() {
        assertProcessErrorResponse(ErrorCode.GAME_REQUEST_NOT_FOUND, "game-request-reject-not-found", REJECT_ACTION);
    }

    @Test
    @DisplayName("초대받은 회원이 아니면 게임방 초대 요청을 거절할 수 없다")
    void rejectGameRequestRejectsForbiddenMember() {
        assertProcessErrorResponse(ErrorCode.GAME_REQUEST_FORBIDDEN, "game-request-reject-forbidden", REJECT_ACTION);
    }

    @Test
    @DisplayName("이미 처리된 게임방 초대 요청을 거절하면 409 상태를 반환한다")
    void rejectGameRequestRejectsProcessedRequest() {
        assertProcessErrorResponse(
                ErrorCode.GAME_REQUEST_ALREADY_PROCESSED,
                "game-request-reject-processed",
                REJECT_ACTION
        );
    }

    @Test
    @DisplayName("존재하지 않는 게임방의 초대 요청을 취소하면 404 상태를 반환한다")
    void cancelGameRequestRejectsMissingRoom() {
        assertProcessErrorResponse(ErrorCode.ROOM_NOT_FOUND, "game-request-cancel-room-not-found", CANCEL_ACTION);
    }

    @Test
    @DisplayName("존재하지 않는 게임방 초대 요청을 취소하면 404 상태를 반환한다")
    void cancelGameRequestRejectsMissingRequest() {
        assertProcessErrorResponse(ErrorCode.GAME_REQUEST_NOT_FOUND, "game-request-cancel-not-found", CANCEL_ACTION);
    }

    @Test
    @DisplayName("초대한 회원이 아니면 게임방 초대 요청을 취소할 수 없다")
    void cancelGameRequestRejectsForbiddenMember() {
        assertProcessErrorResponse(ErrorCode.GAME_REQUEST_FORBIDDEN, "game-request-cancel-forbidden", CANCEL_ACTION);
    }

    @Test
    @DisplayName("이미 처리된 게임방 초대 요청을 취소하면 409 상태를 반환한다")
    void cancelGameRequestRejectsProcessedRequest() {
        assertProcessErrorResponse(
                ErrorCode.GAME_REQUEST_ALREADY_PROCESSED,
                "game-request-cancel-processed",
                CANCEL_ACTION
        );
    }

    private void assertErrorResponse(ErrorCode errorCode, String documentIdentifier) {
        GameRequestCreateRequest request = new GameRequestCreateRequest(2L);
        willThrow(new CustomException(errorCode))
                .given(gameRequestCommandService)
                .createGameRequest(1L, 10L, request);

        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "inviteeId": 2
                        }
                        """)
                .when()
                .post("/rooms/{roomId}/requests", 10L)
                .then()
                .statusCode(errorCode.getHttpStatus().value())
                .body("status", equalTo(errorCode.getHttpStatus().value()))
                .body("message", equalTo(errorCode.getMessage()))
                .apply(document(documentIdentifier,
                        pathParameters(
                                parameterWithName("roomId").description("초대할 게임방 ID")
                        ),
                        requestFields(
                                fieldWithPath("inviteeId").description("초대받을 친구 회원 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
        then(gameRequestCommandService).should().createGameRequest(1L, 10L, request);
    }

    private void assertProcessErrorResponse(ErrorCode errorCode, String documentIdentifier, String action) {
        if (ACCEPT_ACTION.equals(action)) {
            willThrow(new CustomException(errorCode))
                    .given(gameRequestCommandService)
                    .acceptGameRequest(1L, 10L, 20L);
        } else if (REJECT_ACTION.equals(action)) {
            willThrow(new CustomException(errorCode))
                    .given(gameRequestCommandService)
                    .rejectGameRequest(1L, 10L, 20L);
        } else {
            willThrow(new CustomException(errorCode))
                    .given(gameRequestCommandService)
                    .cancelGameRequest(1L, 10L, 20L);
        }

        given()
                .when()
                .patch("/rooms/{roomId}/requests/{requestId}/" + action, 10L, 20L)
                .then()
                .statusCode(errorCode.getHttpStatus().value())
                .body("status", equalTo(errorCode.getHttpStatus().value()))
                .body("message", equalTo(errorCode.getMessage()))
                .apply(document(documentIdentifier,
                        pathParameters(
                                parameterWithName("roomId").description("초대를 처리할 게임방 ID"),
                                parameterWithName("requestId").description("처리할 게임방 초대 요청 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
        if (ACCEPT_ACTION.equals(action)) {
            then(gameRequestCommandService).should().acceptGameRequest(1L, 10L, 20L);
        } else if (REJECT_ACTION.equals(action)) {
            then(gameRequestCommandService).should().rejectGameRequest(1L, 10L, 20L);
        } else {
            then(gameRequestCommandService).should().cancelGameRequest(1L, 10L, 20L);
        }
    }

    private RoomDetailResponse roomDetailResponse() {
        LocalDateTime startedAt = LocalDateTime.of(2026, 7, 31, 9, 0);
        return new RoomDetailResponse(
                10L,
                "주간 운동",
                GameMode.COOPERATE,
                RoomStatus.ACTIVE,
                4,
                null,
                12_000,
                16,
                2,
                1L,
                startedAt,
                List.of(new RoomMemberResponse(
                        1L,
                        "방장",
                        Gender.MALE,
                        "https://example.com/male.png",
                        List.of(equippedItem()),
                        true,
                        2,
                        startedAt,
                        null
                ))
        );
    }

    private MyRoomResponse myRoomResponse() {
        LocalDateTime joinedAt = LocalDateTime.of(2026, 7, 31, 9, 0);
        return new MyRoomResponse(
                10L,
                "주간 운동",
                GameMode.COOPERATE,
                RoomStatus.ACTIVE,
                4,
                null,
                12_000,
                16,
                2,
                1L,
                joinedAt,
                List.of(new MyRoomMemberResponse(
                        1L,
                        "방장",
                        Gender.MALE,
                        "https://example.com/male.png",
                        List.of(equippedItem()),
                        true
                ))
        );
    }

    private EquippedItemDto equippedItem() {
        return new EquippedItemDto(
                10L,
                100L,
                "빨간 모자",
                ItemCategory.HAT,
                "https://example.com/hat.png"
        );
    }

    private FieldDescriptor[] roomDetailFields() {
        return new FieldDescriptor[]{
                fieldWithPath("roomId").description("게임방 ID"),
                fieldWithPath("name").description("게임방 이름"),
                fieldWithPath("mode").description("게임 모드"),
                fieldWithPath("status").description("방 상태(ACTIVE, CLOSED)"),
                fieldWithPath("boardSize").description("현재 또는 최신 빙고판 크기"),
                fieldWithPath("targetBingoCount").optional()
                        .description("목표 빙고 수(공유 모드는 null, 대결 모드만 사용)"),
                fieldWithPath("targetStepCount").description("현재 또는 최신 목표 걸음 수"),
                fieldWithPath("totalMissionCount").description("전체 미션 수"),
                fieldWithPath("completedMissionCount").description("완료 미션 수"),
                fieldWithPath("hostId").description("방장 회원 ID"),
                fieldWithPath("startedAt").description("선택된 게임 회차 시작 시각"),
                fieldWithPath("members[].memberId").description("현재 방 회원 ID"),
                fieldWithPath("members[].nickname").description("현재 방 회원 닉네임"),
                fieldWithPath("members[].gender").description("회원 아바타 성별"),
                fieldWithPath("members[].defaultImageUrl")
                        .optional()
                        .description("성별 기본 아바타 이미지 URL"),
                fieldWithPath("members[].equippedItems").description("현재 장착 아이템 목록"),
                fieldWithPath("members[].equippedItems[].memberItemId")
                        .description("회원 보유 아이템 ID"),
                fieldWithPath("members[].equippedItems[].itemId").description("원본 아이템 ID"),
                fieldWithPath("members[].equippedItems[].name").description("아이템 이름"),
                fieldWithPath("members[].equippedItems[].category").description("장착 카테고리"),
                fieldWithPath("members[].equippedItems[].imageUrl").description("아이템 이미지 URL"),
                fieldWithPath("members[].host").description("방장 여부"),
                fieldWithPath("members[].completedMissionCount").description("현재 회차 완료 미션 수"),
                fieldWithPath("members[].joinedAt").description("현재 방 참여 시각"),
                fieldWithPath("members[].bingoBoardId").description("대결 개인 빙고판 ID")
        };
    }
}
