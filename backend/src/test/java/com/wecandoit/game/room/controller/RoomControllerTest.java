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
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.relaxedResponseFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.game.controller.request.CreateRoomRequest;
import com.wecandoit.game.controller.request.UpdateRoomNameRequest;
import com.wecandoit.game.controller.RoomController;
import com.wecandoit.game.controller.response.CreateRoomResponse;
import com.wecandoit.game.controller.response.MyRoomMemberResponse;
import com.wecandoit.game.controller.response.MyRoomResponse;
import com.wecandoit.game.controller.response.RoomDetailResponse;
import com.wecandoit.game.controller.response.RoomMemberResponse;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.service.RoomCommandService;
import com.wecandoit.game.service.RoomReadService;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("게임방 API")
@ExtendWith({RestDocumentationExtension.class, MockitoExtension.class})
class RoomControllerTest {

    @Mock
    private RoomCommandService roomCommandService;
    @Mock
    private RoomReadService roomReadService;

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new RoomController(
                        roomCommandService,
                        roomReadService
                ))
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
    @DisplayName("게임방을 생성하면 생성된 방 ID와 상태를 반환한다")
    void createRoomReturnsCreatedRoom() {
        // given
        CreateRoomRequest request = new CreateRoomRequest("테스트 방", GameMode.BATTLE, 3, null, 3);
        given(roomCommandService.createRoom(1L, request))
                .willReturn(new CreateRoomResponse(10L, GameRoomStatus.WAITING));
        given(roomReadService.getRoomDetail(1L, 10L)).willReturn(new RoomDetailResponse(
                10L,
                "테스트 방",
                GameMode.BATTLE,
                GameRoomStatus.WAITING,
                3,
                null,
                9,
                0,
                1L,
                null,
                List.of()
        ));

        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "name": "  테스트 방  ",
                          "mode": "BATTLE",
                          "targetBingoCount": 3,
                          "targetStepCount": null,
                          "boardSize": 3
                        }
                        """)
                .when()
                .post("/rooms")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("roomId", equalTo(10))
                .body("name", equalTo("테스트 방"))
                .body("status", equalTo("WAITING"))
                .apply(document("room-create",
                        requestFields(
                                fieldWithPath("name").description("게임방 이름 (1~20자, 앞뒤 공백 제거)"),
                                fieldWithPath("mode").description("게임 모드"),
                                fieldWithPath("targetBingoCount").description("목표 빙고 수"),
                                fieldWithPath("targetStepCount").description("싱글·협동 모드 공동 목표 걸음 수 (대결 null)"),
                                fieldWithPath("boardSize").description("빙고판 크기 (3~5)")
                        ),
                        relaxedResponseFields(
                                fieldWithPath("roomId").description("생성된 게임방 ID"),
                                fieldWithPath("name").description("게임방 이름"),
                                fieldWithPath("status").description("게임방 상태")
                        )
                ));
        then(roomCommandService).should().createRoom(1L, request);
        then(roomReadService).should().getRoomDetail(1L, 10L);
    }

    @Test
    @DisplayName("게임방 이름이 없으면 게임방 생성에 실패한다")
    void createRoomRejectsMissingName() {
        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "mode": "BATTLE",
                          "targetBingoCount": 3,
                          "targetStepCount": null,
                          "boardSize": 3
                        }
                        """)
                .when()
                .post("/rooms")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .apply(document("room-create-invalid-name",
                        requestFields(
                                fieldWithPath("mode").description("게임 모드"),
                                fieldWithPath("targetBingoCount").description("목표 빙고 수"),
                                fieldWithPath("targetStepCount").description("공동 목표 걸음 수"),
                                fieldWithPath("boardSize").description("빙고판 크기")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
        then(roomCommandService).should(never()).createRoom(Mockito.anyLong(), Mockito.any());
    }

    @Test
    @DisplayName("게임방 이름이 공백이면 게임방 생성에 실패한다")
    void createRoomRejectsBlankName() {
        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "name": "   ",
                          "mode": "BATTLE",
                          "targetBingoCount": 3,
                          "targetStepCount": null,
                          "boardSize": 3
                        }
                        """)
                .when()
                .post("/rooms")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        then(roomCommandService).should(never()).createRoom(Mockito.anyLong(), Mockito.any());
    }

    @Test
    @DisplayName("게임방 이름이 20자를 초과하면 게임방 생성에 실패한다")
    void createRoomRejectsTooLongName() {
        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "name": "123456789012345678901",
                          "mode": "BATTLE",
                          "targetBingoCount": 3,
                          "targetStepCount": null,
                          "boardSize": 3
                        }
                        """)
                .when()
                .post("/rooms")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        then(roomCommandService).should(never()).createRoom(Mockito.anyLong(), Mockito.any());
    }

    @Test
    @DisplayName("게임 모드가 없으면 게임방 생성에 실패한다")
    void createRoomRejectsMissingMode() {
        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "name": "테스트 방",
                          "targetBingoCount": 3
                        }
                        """)
                .when()
                .post("/rooms")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .apply(document("room-create-invalid-mode",
                        requestFields(
                                fieldWithPath("name").description("게임방 이름"),
                                fieldWithPath("targetBingoCount").description("목표 빙고 수")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
        then(roomCommandService).should(never()).createRoom(Mockito.anyLong(), Mockito.any());
    }

    @Test
    @DisplayName("목표 빙고 수가 1보다 작으면 게임방 생성에 실패한다")
    void createRoomRejectsInvalidTargetBingoCount() {
        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "name": "테스트 방",
                          "mode": "SINGLE",
                          "targetBingoCount": 0,
                          "boardSize": 3
                        }
                        """)
                .when()
                .post("/rooms")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        then(roomCommandService).should(never()).createRoom(Mockito.anyLong(), Mockito.any());
    }

    @Test
    @DisplayName("빙고판 크기가 범위를 벗어나면 게임방 생성에 실패한다")
    void createRoomRejectsInvalidBoardSize() {
        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "name": "테스트 방",
                          "mode": "SINGLE",
                          "targetBingoCount": 3,
                          "boardSize": 2
                        }
                        """)
                .when()
                .post("/rooms")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        then(roomCommandService).should(never()).createRoom(Mockito.anyLong(), Mockito.any());
    }

    @Test
    @DisplayName("내 게임방 목록을 조회하면 200 상태와 참여 중인 게임방 목록을 반환한다")
    void getMyRoomsReturnsRooms() {
        // given
        LocalDateTime joinedAt = LocalDateTime.of(2026, 7, 22, 10, 0);
        given(roomReadService.getMyRooms(1L, null))
                .willReturn(List.of(new MyRoomResponse(
                        10L,
                        "테스트 방",
                        GameMode.COOPERATE,
                        GameRoomStatus.WAITING,
                        3,
                        10_000,
                        9,
                        2,
                        1L,
                        joinedAt,
                        List.of(
                                new MyRoomMemberResponse(1L, "방장", true),
                                new MyRoomMemberResponse(2L, "참여자", false)
                        )
                )));

        // when & then
        given()
                .when()
                .get("/rooms")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("[0].roomId", equalTo(10))
                .body("[0].name", equalTo("테스트 방"))
                .body("[0].mode", equalTo("COOPERATE"))
                .body("[0].status", equalTo("WAITING"))
                .body("[0].targetBingoCount", equalTo(3))
                .body("[0].targetStepCount", equalTo(10_000))
                .body("[0].totalMissionCount", equalTo(9))
                .body("[0].completedMissionCount", equalTo(2))
                .body("[0].hostId", equalTo(1))
                .body("[0].joinedAt", equalTo("2026-07-22T10:00:00"))
                .body("[0].members[0].memberId", equalTo(1))
                .body("[0].members[0].nickname", equalTo("방장"))
                .body("[0].members[0].host", equalTo(true))
                .body("[0].members[1].memberId", equalTo(2))
                .body("[0].members[1].nickname", equalTo("참여자"))
                .body("[0].members[1].host", equalTo(false))
                .apply(document("room-my-list",
                        queryParameters(
                                parameterWithName("mode")
                                        .optional()
                                        .description("조회할 게임 모드 (SINGLE, COOPERATE, BATTLE). 생략 시 전체")
                        ),
                        responseFields(
                                fieldWithPath("[].roomId").description("게임방 ID"),
                                fieldWithPath("[].name").description("게임방 이름 (기존 방은 null 가능)"),
                                fieldWithPath("[].mode").description("게임 모드"),
                                fieldWithPath("[].status").description("게임방 상태"),
                                fieldWithPath("[].targetBingoCount").description("목표 빙고 수"),
                                fieldWithPath("[].targetStepCount")
                                        .description("싱글·협동 모드 공동 목표 걸음 수 (대결 null)"),
                                fieldWithPath("[].totalMissionCount").description("방 전체 미션 총 개수"),
                                fieldWithPath("[].completedMissionCount").description("방 전체 완료 미션 수"),
                                fieldWithPath("[].hostId").description("방장 회원 ID"),
                                fieldWithPath("[].joinedAt").description("로그인 회원의 게임방 참여 시각"),
                                fieldWithPath("[].members[].memberId").description("참여자 회원 ID"),
                                fieldWithPath("[].members[].nickname").description("참여자 닉네임"),
                                fieldWithPath("[].members[].host").description("방장 여부")
                        )
                ));
        then(roomReadService).should().getMyRooms(1L, null);
    }

    @Test
    @DisplayName("내 게임방 목록을 게임 모드로 필터링한다")
    void getMyRoomsReturnsRoomsFilteredByMode() {
        // given
        given(roomReadService.getMyRooms(1L, GameMode.BATTLE)).willReturn(List.of());

        // when & then
        given()
                .queryParam("mode", "BATTLE")
                .when()
                .get("/rooms")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("size()", equalTo(0));
        then(roomReadService).should().getMyRooms(1L, GameMode.BATTLE);
    }

    @Test
    @DisplayName("내 게임방 목록 조회 중 참여자 회원을 찾을 수 없으면 404 상태를 반환한다")
    void getMyRoomsRejectsMissingMember() {
        // given
        willThrow(new CustomException(ErrorCode.MEMBER_NOT_FOUND))
                .given(roomReadService)
                .getMyRooms(1L, null);

        // when & then
        given()
                .when()
                .get("/rooms")
                .then()
                .statusCode(HttpStatus.NOT_FOUND.value())
                .apply(document("room-my-list-member-not-found",
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
    }

    @Test
    @DisplayName("게임방 상세를 조회하면 200 상태와 방 정보 및 참여자 목록을 반환한다")
    void getRoomDetailReturnsRoomDetail() {
        // given
        LocalDateTime startedAt = LocalDateTime.of(2026, 7, 22, 9, 50);
        LocalDateTime joinedAt = LocalDateTime.of(2026, 7, 22, 10, 0);
        given(roomReadService.getRoomDetail(1L, 10L))
                .willReturn(new RoomDetailResponse(
                        10L,
                        "테스트 방",
                        GameMode.COOPERATE,
                        GameRoomStatus.WAITING,
                        3,
                        10_000,
                        9,
                        2,
                        1L,
                        startedAt,
                        List.of(new RoomMemberResponse(
                                1L,
                                "방장",
                                true,
                                2,
                                joinedAt,
                                null
                        ))
                ));

        // when & then
        given()
                .when()
                .get("/rooms/{roomId}", 10L)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("roomId", equalTo(10))
                .body("name", equalTo("테스트 방"))
                .body("mode", equalTo("COOPERATE"))
                .body("status", equalTo("WAITING"))
                .body("targetBingoCount", equalTo(3))
                .body("targetStepCount", equalTo(10_000))
                .body("totalMissionCount", equalTo(9))
                .body("completedMissionCount", equalTo(2))
                .body("hostId", equalTo(1))
                .body("startedAt", equalTo("2026-07-22T09:50:00"))
                .body("members[0].memberId", equalTo(1))
                .body("members[0].nickname", equalTo("방장"))
                .body("members[0].host", equalTo(true))
                .body("members[0].completedMissionCount", equalTo(2))
                .body("members[0].joinedAt", equalTo("2026-07-22T10:00:00"))
                .apply(document("room-detail",
                        pathParameters(
                                parameterWithName("roomId").description("상세 조회할 게임방 ID")
                        ),
                        responseFields(
                                fieldWithPath("roomId").description("게임방 ID"),
                                fieldWithPath("name").description("게임방 이름 (기존 방은 null 가능)"),
                                fieldWithPath("mode").description("게임 모드"),
                                fieldWithPath("status").description("게임방 상태"),
                                fieldWithPath("targetBingoCount").description("목표 빙고 수"),
                                fieldWithPath("targetStepCount")
                                        .description("싱글·협동 모드 공동 목표 걸음 수 (대결 null)"),
                                fieldWithPath("totalMissionCount").description("방 전체 미션 총 개수"),
                                fieldWithPath("completedMissionCount").description("방 전체 완료 미션 수"),
                                fieldWithPath("hostId").description("방장 회원 ID"),
                                fieldWithPath("startedAt").description("게임 시작 시각"),
                                fieldWithPath("members[].memberId").description("참여자 회원 ID"),
                                fieldWithPath("members[].nickname").description("참여자 닉네임"),
                                fieldWithPath("members[].host").description("방장 여부"),
                                fieldWithPath("members[].completedMissionCount").description("완료한 미션 수"),
                                fieldWithPath("members[].joinedAt").description("게임방 참여 시각"),
                                fieldWithPath("members[].bingoBoardId").description("대결 모드 개인 빙고판 ID (그 외 null)")
                        )
                ));
        then(roomReadService).should().getRoomDetail(1L, 10L);
    }

    @Test
    @DisplayName("존재하지 않는 게임방의 상세를 조회하면 404 상태를 반환한다")
    void getRoomDetailRejectsMissingRoom() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_NOT_FOUND))
                .given(roomReadService)
                .getRoomDetail(1L, 10L);

        // when & then
        assertRoomDetailErrorResponse(HttpStatus.NOT_FOUND, "room-detail-room-not-found");
    }

    @Test
    @DisplayName("게임방 참여자가 아니면 상세 조회에 실패한다")
    void getRoomDetailRejectsNonMember() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN))
                .given(roomReadService)
                .getRoomDetail(1L, 10L);

        // when & then
        assertRoomDetailErrorResponse(HttpStatus.FORBIDDEN, "room-detail-forbidden");
    }

    @Test
    @DisplayName("종료된 게임방의 상세를 조회하면 409 상태를 반환한다")
    void getRoomDetailRejectsClosedRoom() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_CLOSED))
                .given(roomReadService)
                .getRoomDetail(1L, 10L);

        // when & then
        assertRoomDetailErrorResponse(HttpStatus.CONFLICT, "room-detail-closed");
    }

    @Test
    @DisplayName("참여자 회원을 찾을 수 없으면 상세 조회에 실패한다")
    void getRoomDetailRejectsMissingMember() {
        // given
        willThrow(new CustomException(ErrorCode.MEMBER_NOT_FOUND))
                .given(roomReadService)
                .getRoomDetail(1L, 10L);

        // when & then
        assertRoomDetailErrorResponse(HttpStatus.NOT_FOUND, "room-detail-member-not-found");
    }

    @Test
    @DisplayName("게임방 참여자 목록을 조회하면 200 상태와 참여자 목록을 반환한다")
    void getRoomMembersReturnsMembers() {
        // given
        LocalDateTime joinedAt = LocalDateTime.of(2026, 7, 22, 10, 0);
        given(roomReadService.getRoomMembers(1L, 10L))
                .willReturn(List.of(new RoomMemberResponse(
                        1L,
                        "방장",
                        true,
                        2,
                        joinedAt,
                        null
                )));

        // when & then
        given()
                .when()
                .get("/rooms/{roomId}/members", 10L)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("[0].memberId", equalTo(1))
                .body("[0].nickname", equalTo("방장"))
                .body("[0].host", equalTo(true))
                .body("[0].completedMissionCount", equalTo(2))
                .body("[0].joinedAt", equalTo("2026-07-22T10:00:00"))
                .apply(document("room-member-list",
                        pathParameters(
                                parameterWithName("roomId").description("참여자 목록을 조회할 게임방 ID")
                        ),
                        responseFields(
                                fieldWithPath("[].memberId").description("참여자 회원 ID"),
                                fieldWithPath("[].nickname").description("참여자 닉네임"),
                                fieldWithPath("[].host").description("방장 여부"),
                                fieldWithPath("[].completedMissionCount").description("완료한 미션 수"),
                                fieldWithPath("[].joinedAt").description("게임방 참여 시각"),
                                fieldWithPath("[].bingoBoardId").description("대결 모드 개인 빙고판 ID (그 외 null)")
                        )
                ));
        then(roomReadService).should().getRoomMembers(1L, 10L);
    }

    @Test
    @DisplayName("존재하지 않는 게임방의 참여자 목록을 조회하면 404 상태를 반환한다")
    void getRoomMembersRejectsMissingRoom() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_NOT_FOUND))
                .given(roomReadService)
                .getRoomMembers(1L, 10L);

        // when & then
        given()
                .when()
                .get("/rooms/{roomId}/members", 10L)
                .then()
                .statusCode(HttpStatus.NOT_FOUND.value())
                .apply(document("room-member-list-room-not-found",
                        pathParameters(
                                parameterWithName("roomId").description("참여자 목록을 조회할 게임방 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
    }

    @Test
    @DisplayName("게임방 참여자가 아니면 참여자 목록 조회에 실패한다")
    void getRoomMembersRejectsNonMember() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN))
                .given(roomReadService)
                .getRoomMembers(1L, 10L);

        // when & then
        given()
                .when()
                .get("/rooms/{roomId}/members", 10L)
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value())
                .apply(document("room-member-list-forbidden",
                        pathParameters(
                                parameterWithName("roomId").description("참여자 목록을 조회할 게임방 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
    }

    @Test
    @DisplayName("참여자 회원을 찾을 수 없으면 참여자 목록 조회에 실패한다")
    void getRoomMembersRejectsMissingMember() {
        // given
        willThrow(new CustomException(ErrorCode.MEMBER_NOT_FOUND))
                .given(roomReadService)
                .getRoomMembers(1L, 10L);

        // when & then
        given()
                .when()
                .get("/rooms/{roomId}/members", 10L)
                .then()
                .statusCode(HttpStatus.NOT_FOUND.value())
                .apply(document("room-member-list-member-not-found",
                        pathParameters(
                                parameterWithName("roomId").description("참여자 목록을 조회할 게임방 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
    }

    @Test
    @DisplayName("방장이 게임을 시작하면 200 상태와 갱신된 방 정보를 반환한다")
    void startGameReturnsUpdatedRoomDetail() {
        // given
        LocalDateTime startedAt = LocalDateTime.of(2026, 7, 22, 9, 50);
        given(roomReadService.getRoomDetail(1L, 10L))
                .willReturn(new RoomDetailResponse(
                        10L,
                        "테스트 방",
                        GameMode.BATTLE,
                        GameRoomStatus.IN_PROGRESS,
                        3,
                        null,
                        18,
                        0,
                        1L,
                        startedAt,
                        List.of(
                                new RoomMemberResponse(1L, "방장", true, 0, startedAt, 201L),
                                new RoomMemberResponse(2L, "상대방", false, 0, startedAt, 202L)
                        )
                ));

        // when & then
        given()
                .when()
                .post("/rooms/{roomId}/start", 10L)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("roomId", equalTo(10))
                .body("name", equalTo("테스트 방"))
                .body("mode", equalTo("BATTLE"))
                .body("status", equalTo("IN_PROGRESS"))
                .body("targetBingoCount", equalTo(3))
                .body("targetStepCount", nullValue())
                .body("totalMissionCount", equalTo(18))
                .body("completedMissionCount", equalTo(0))
                .body("startedAt", equalTo("2026-07-22T09:50:00"))
                .body("members[0].bingoBoardId", equalTo(201))
                .body("members[1].bingoBoardId", equalTo(202))
                .apply(document("room-start",
                        pathParameters(
                                parameterWithName("roomId").description("게임을 시작할 게임방 ID")
                        ),
                        responseFields(
                                fieldWithPath("roomId").description("게임방 ID"),
                                fieldWithPath("name").description("게임방 이름 (기존 방은 null 가능)"),
                                fieldWithPath("mode").description("게임 모드"),
                                fieldWithPath("status").description("게임방 상태"),
                                fieldWithPath("targetBingoCount").description("목표 빙고 수"),
                                fieldWithPath("targetStepCount")
                                        .description("싱글·협동 모드 공동 목표 걸음 수 (대결 null)"),
                                fieldWithPath("totalMissionCount").description("방 전체 미션 총 개수"),
                                fieldWithPath("completedMissionCount").description("방 전체 완료 미션 수"),
                                fieldWithPath("hostId").description("방장 회원 ID"),
                                fieldWithPath("startedAt").description("게임 시작 시각"),
                                fieldWithPath("members[].memberId").description("참여자 회원 ID"),
                                fieldWithPath("members[].nickname").description("참여자 닉네임"),
                                fieldWithPath("members[].host").description("방장 여부"),
                                fieldWithPath("members[].completedMissionCount").description("완료한 미션 수"),
                                fieldWithPath("members[].joinedAt").description("게임방 참여 시각"),
                                fieldWithPath("members[].bingoBoardId").description("대결 모드 개인 빙고판 ID (그 외 null)")
                        )
                ));
        then(roomCommandService).should().startGame(1L, 10L);
        then(roomReadService).should().getRoomDetail(1L, 10L);
    }

    @Test
    @DisplayName("존재하지 않는 게임방에서 게임을 시작하면 404 상태를 반환한다")
    void startGameRejectsMissingRoom() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_NOT_FOUND))
                .given(roomCommandService)
                .startGame(1L, 10L);

        // when & then
        assertStartGameErrorResponse(HttpStatus.NOT_FOUND, "room-start-room-not-found");
    }

    @Test
    @DisplayName("방장이 아닌 회원이 게임을 시작하면 403 상태를 반환한다")
    void startGameRejectsNonHost() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_START_FORBIDDEN))
                .given(roomCommandService)
                .startGame(1L, 10L);

        // when & then
        assertStartGameErrorResponse(HttpStatus.FORBIDDEN, "room-start-forbidden");
    }

    @Test
    @DisplayName("READY 상태가 아닌 게임방에서 게임을 시작하면 409 상태를 반환한다")
    void startGameRejectsRoomNotReady() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_NOT_READY))
                .given(roomCommandService)
                .startGame(1L, 10L);

        // when & then
        assertStartGameErrorResponse(HttpStatus.CONFLICT, "room-start-not-ready");
    }

    @Test
    @DisplayName("최소 인원이 충족되지 않은 게임방에서 게임을 시작하면 409 상태를 반환한다")
    void startGameRejectsInsufficientParticipants() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_MINIMUM_PARTICIPANTS_REQUIRED))
                .given(roomCommandService)
                .startGame(1L, 10L);

        // when & then
        assertStartGameErrorResponse(HttpStatus.CONFLICT, "room-start-insufficient-participants");
    }

    @Test
    @DisplayName("방장이 게임방 이름을 변경하면 204 상태를 반환한다")
    void updateRoomNameReturnsNoContent() {
        // given
        UpdateRoomNameRequest request = new UpdateRoomNameRequest("변경된 방");

        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "name": "  변경된 방  "
                        }
                        """)
                .when()
                .patch("/rooms/{roomId}", 10L)
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value())
                .apply(document("room-update-name",
                        pathParameters(
                                parameterWithName("roomId").description("이름을 변경할 게임방 ID")
                        ),
                        requestFields(
                                fieldWithPath("name").description("변경할 게임방 이름 (1~20자, 앞뒤 공백 제거)")
                        )
                ));
        then(roomCommandService).should().updateRoomName(1L, 10L, request);
    }

    @Test
    @DisplayName("게임방 이름이 공백이면 이름 변경에 실패한다")
    void updateRoomNameRejectsBlankName() {
        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "name": "   "
                        }
                        """)
                .when()
                .patch("/rooms/{roomId}", 10L)
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        then(roomCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("게임방 이름이 20자를 초과하면 이름 변경에 실패한다")
    void updateRoomNameRejectsTooLongName() {
        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "name": "123456789012345678901"
                        }
                        """)
                .when()
                .patch("/rooms/{roomId}", 10L)
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        then(roomCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("방장이 아닌 회원이 게임방 이름을 변경하면 403 상태를 반환한다")
    void updateRoomNameRejectsNonHost() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_UPDATE_FORBIDDEN))
                .given(roomCommandService)
                .updateRoomName(Mockito.eq(1L), Mockito.eq(10L), Mockito.any(UpdateRoomNameRequest.class));

        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "name": "변경된 방"
                        }
                        """)
                .when()
                .patch("/rooms/{roomId}", 10L)
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value())
                .apply(document("room-update-name-forbidden",
                        pathParameters(
                                parameterWithName("roomId").description("이름을 변경할 게임방 ID")
                        ),
                        requestFields(
                                fieldWithPath("name").description("변경할 게임방 이름")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
    }

    @Test
    @DisplayName("게임방을 나가면 204 상태를 반환한다")
    void leaveRoomReturnsNoContent() {
        // when & then
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
    @DisplayName("존재하지 않는 게임방을 나가면 404 상태를 반환한다")
    void leaveRoomRejectsMissingRoom() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_NOT_FOUND))
                .given(roomCommandService)
                .leaveRoom(1L, 10L);

        // when & then
        assertLeaveRoomErrorResponse(HttpStatus.NOT_FOUND, "room-leave-room-not-found");
    }

    @Test
    @DisplayName("종료된 게임방을 나가면 409 상태를 반환한다")
    void leaveRoomRejectsClosedRoom() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_CLOSED))
                .given(roomCommandService)
                .leaveRoom(1L, 10L);

        // when & then
        assertLeaveRoomErrorResponse(HttpStatus.CONFLICT, "room-leave-closed");
    }

    @Test
    @DisplayName("게임방 참여자가 아니면 나가기에 실패한다")
    void leaveRoomRejectsNonMember() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN))
                .given(roomCommandService)
                .leaveRoom(1L, 10L);

        // when & then
        assertLeaveRoomErrorResponse(HttpStatus.FORBIDDEN, "room-leave-forbidden");
    }

    @Test
    @DisplayName("방장이 게임방을 삭제하면 204 상태를 반환한다")
    void deleteRoomReturnsNoContent() {
        // when & then
        given()
                .when()
                .delete("/rooms/{roomId}", 10L)
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value())
                .apply(document("room-delete",
                        pathParameters(
                                parameterWithName("roomId").description("삭제할 게임방 ID")
                        )
                ));
        then(roomCommandService).should().deleteRoom(1L, 10L);
    }

    @Test
    @DisplayName("존재하지 않는 게임방을 삭제하면 404 상태를 반환한다")
    void deleteRoomRejectsMissingRoom() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_NOT_FOUND))
                .given(roomCommandService)
                .deleteRoom(1L, 10L);

        // when & then
        given()
                .when()
                .delete("/rooms/{roomId}", 10L)
                .then()
                .statusCode(HttpStatus.NOT_FOUND.value());
    }

    @Test
    @DisplayName("방장이 아닌 회원이 게임방을 삭제하면 403 상태를 반환한다")
    void deleteRoomRejectsNonHost() {
        // given
        willThrow(new CustomException(ErrorCode.ROOM_DELETE_FORBIDDEN))
                .given(roomCommandService)
                .deleteRoom(1L, 10L);

        // when & then
        given()
                .when()
                .delete("/rooms/{roomId}", 10L)
                .then()
                .statusCode(HttpStatus.FORBIDDEN.value());
    }

    private void assertRoomDetailErrorResponse(HttpStatus status, String documentName) {
        given()
                .when()
                .get("/rooms/{roomId}", 10L)
                .then()
                .statusCode(status.value())
                .apply(document(documentName,
                        pathParameters(
                                parameterWithName("roomId").description("상세 조회할 게임방 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
    }

    private void assertStartGameErrorResponse(HttpStatus status, String documentName) {
        given()
                .when()
                .post("/rooms/{roomId}/start", 10L)
                .then()
                .statusCode(status.value())
                .apply(document(documentName,
                        pathParameters(
                                parameterWithName("roomId").description("게임을 시작할 게임방 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
    }

    private void assertLeaveRoomErrorResponse(HttpStatus status, String documentName) {
        given()
                .when()
                .delete("/rooms/{roomId}/members/me", 10L)
                .then()
                .statusCode(status.value())
                .apply(document(documentName,
                        pathParameters(
                                parameterWithName("roomId").description("나갈 게임방 ID")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
    }
}
