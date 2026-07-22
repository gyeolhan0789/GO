package com.wecandoit.game.room.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.game.room.controller.request.CreateRoomRequest;
import com.wecandoit.game.room.controller.response.CreateRoomResponse;
import com.wecandoit.game.room.controller.response.MyRoomMemberResponse;
import com.wecandoit.game.room.controller.response.MyRoomResponse;
import com.wecandoit.game.room.controller.response.RoomDetailResponse;
import com.wecandoit.game.room.controller.response.RoomMemberResponse;
import com.wecandoit.game.room.domain.GameMode;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.service.RoomCommandService;
import com.wecandoit.game.room.service.RoomReadService;
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

@DisplayName("게임방 API")
@ExtendWith(RestDocumentationExtension.class)
class RoomControllerTest {

    private final RoomCommandService roomCommandService = Mockito.mock(RoomCommandService.class);
    private final RoomReadService roomReadService = Mockito.mock(RoomReadService.class);

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
        CreateRoomRequest request = new CreateRoomRequest(GameMode.SINGLE, 3, 3);
        when(roomCommandService.createRoom(1L, request))
                .thenReturn(new CreateRoomResponse(10L, GameRoomStatus.CREATED));

        // when, then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "mode": "SINGLE",
                          "targetBingoCount": 3,
                          "boardSize": 3
                        }
                        """)
                .when()
                .post("/rooms")
                .then()
                .statusCode(HttpStatus.CREATED.value())
                .body("roomId", equalTo(10))
                .body("status", equalTo("CREATED"))
                .apply(document("room-create",
                        requestFields(
                                fieldWithPath("mode").description("게임 모드"),
                                fieldWithPath("targetBingoCount").description("목표 빙고 수"),
                                fieldWithPath("boardSize").description("빙고판 크기 (3~5)")
                        ),
                        responseFields(
                                fieldWithPath("roomId").description("생성된 게임방 ID"),
                                fieldWithPath("status").description("게임방 상태")
                        )
                ));
        verify(roomCommandService).createRoom(1L, request);
    }

    @Test
    @DisplayName("게임 모드가 없으면 게임방 생성에 실패한다")
    void createRoomRejectsMissingMode() {
        // when, then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "targetBingoCount": 3
                        }
                        """)
                .when()
                .post("/rooms")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .apply(document("room-create-invalid-mode",
                        requestFields(
                                fieldWithPath("targetBingoCount").description("목표 빙고 수")
                        ),
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
        verify(roomCommandService, never()).createRoom(Mockito.anyLong(), Mockito.any());
    }

    @Test
    @DisplayName("목표 빙고 수가 1보다 작으면 게임방 생성에 실패한다")
    void createRoomRejectsInvalidTargetBingoCount() {
        // when, then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "mode": "SINGLE",
                          "targetBingoCount": 0,
                          "boardSize": 3
                        }
                        """)
                .when()
                .post("/rooms")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        verify(roomCommandService, never()).createRoom(Mockito.anyLong(), Mockito.any());
    }

    @Test
    @DisplayName("빙고판 크기가 범위를 벗어나면 게임방 생성에 실패한다")
    void createRoomRejectsInvalidBoardSize() {
        // when, then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "mode": "SINGLE",
                          "targetBingoCount": 3,
                          "boardSize": 2
                        }
                        """)
                .when()
                .post("/rooms")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        verify(roomCommandService, never()).createRoom(Mockito.anyLong(), Mockito.any());
    }

    @Test
    @DisplayName("내 게임방 목록을 조회하면 200 상태와 참여 중인 게임방 목록을 반환한다")
    void getMyRoomsReturnsRooms() {
        // given
        LocalDateTime joinedAt = LocalDateTime.of(2026, 7, 22, 10, 0);
        when(roomReadService.getMyRooms(1L))
                .thenReturn(List.of(new MyRoomResponse(
                        10L,
                        GameMode.COOPERATE,
                        GameRoomStatus.WAITING,
                        3,
                        1L,
                        joinedAt,
                        List.of(
                                new MyRoomMemberResponse(1L, "방장", true),
                                new MyRoomMemberResponse(2L, "참여자", false)
                        )
                )));

        // when, then
        given()
                .when()
                .get("/rooms")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("[0].roomId", equalTo(10))
                .body("[0].mode", equalTo("COOPERATE"))
                .body("[0].status", equalTo("WAITING"))
                .body("[0].targetBingoCount", equalTo(3))
                .body("[0].hostId", equalTo(1))
                .body("[0].joinedAt", equalTo("2026-07-22T10:00:00"))
                .body("[0].members[0].memberId", equalTo(1))
                .body("[0].members[0].nickname", equalTo("방장"))
                .body("[0].members[0].host", equalTo(true))
                .body("[0].members[1].memberId", equalTo(2))
                .body("[0].members[1].nickname", equalTo("참여자"))
                .body("[0].members[1].host", equalTo(false))
                .apply(document("room-my-list",
                        responseFields(
                                fieldWithPath("[].roomId").description("게임방 ID"),
                                fieldWithPath("[].mode").description("게임 모드"),
                                fieldWithPath("[].status").description("게임방 상태"),
                                fieldWithPath("[].targetBingoCount").description("목표 빙고 수"),
                                fieldWithPath("[].hostId").description("방장 회원 ID"),
                                fieldWithPath("[].joinedAt").description("로그인 회원의 게임방 참여 시각"),
                                fieldWithPath("[].members[].memberId").description("참여자 회원 ID"),
                                fieldWithPath("[].members[].nickname").description("참여자 닉네임"),
                                fieldWithPath("[].members[].host").description("방장 여부")
                        )
                ));
        verify(roomReadService).getMyRooms(1L);
    }

    @Test
    @DisplayName("내 게임방 목록 조회 중 참여자 회원을 찾을 수 없으면 404 상태를 반환한다")
    void getMyRoomsRejectsMissingMember() {
        // given
        doThrow(new CustomException(ErrorCode.MEMBER_NOT_FOUND))
                .when(roomReadService)
                .getMyRooms(1L);

        // when, then
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
        when(roomReadService.getRoomDetail(1L, 10L))
                .thenReturn(new RoomDetailResponse(
                        10L,
                        GameMode.COOPERATE,
                        GameRoomStatus.WAITING,
                        3,
                        1L,
                        startedAt,
                        List.of(new RoomMemberResponse(
                                1L,
                                "방장",
                                true,
                                2,
                                joinedAt
                        ))
                ));

        // when, then
        given()
                .when()
                .get("/rooms/{roomId}", 10L)
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("roomId", equalTo(10))
                .body("mode", equalTo("COOPERATE"))
                .body("status", equalTo("WAITING"))
                .body("targetBingoCount", equalTo(3))
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
                                fieldWithPath("mode").description("게임 모드"),
                                fieldWithPath("status").description("게임방 상태"),
                                fieldWithPath("targetBingoCount").description("목표 빙고 수"),
                                fieldWithPath("hostId").description("방장 회원 ID"),
                                fieldWithPath("startedAt").description("게임 시작 시각"),
                                fieldWithPath("members[].memberId").description("참여자 회원 ID"),
                                fieldWithPath("members[].nickname").description("참여자 닉네임"),
                                fieldWithPath("members[].host").description("방장 여부"),
                                fieldWithPath("members[].completedMissionCount").description("완료한 미션 수"),
                                fieldWithPath("members[].joinedAt").description("게임방 참여 시각")
                        )
                ));
        verify(roomReadService).getRoomDetail(1L, 10L);
    }

    @Test
    @DisplayName("존재하지 않는 게임방의 상세를 조회하면 404 상태를 반환한다")
    void getRoomDetailRejectsMissingRoom() {
        // given
        doThrow(new CustomException(ErrorCode.ROOM_NOT_FOUND))
                .when(roomReadService)
                .getRoomDetail(1L, 10L);

        // when, then
        assertRoomDetailErrorResponse(HttpStatus.NOT_FOUND, "room-detail-room-not-found");
    }

    @Test
    @DisplayName("게임방 참여자가 아니면 상세 조회에 실패한다")
    void getRoomDetailRejectsNonMember() {
        // given
        doThrow(new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN))
                .when(roomReadService)
                .getRoomDetail(1L, 10L);

        // when, then
        assertRoomDetailErrorResponse(HttpStatus.FORBIDDEN, "room-detail-forbidden");
    }

    @Test
    @DisplayName("종료된 게임방의 상세를 조회하면 409 상태를 반환한다")
    void getRoomDetailRejectsClosedRoom() {
        // given
        doThrow(new CustomException(ErrorCode.ROOM_CLOSED))
                .when(roomReadService)
                .getRoomDetail(1L, 10L);

        // when, then
        assertRoomDetailErrorResponse(HttpStatus.CONFLICT, "room-detail-closed");
    }

    @Test
    @DisplayName("참여자 회원을 찾을 수 없으면 상세 조회에 실패한다")
    void getRoomDetailRejectsMissingMember() {
        // given
        doThrow(new CustomException(ErrorCode.MEMBER_NOT_FOUND))
                .when(roomReadService)
                .getRoomDetail(1L, 10L);

        // when, then
        assertRoomDetailErrorResponse(HttpStatus.NOT_FOUND, "room-detail-member-not-found");
    }

    @Test
    @DisplayName("게임방 참여자 목록을 조회하면 200 상태와 참여자 목록을 반환한다")
    void getRoomMembersReturnsMembers() {
        // given
        LocalDateTime joinedAt = LocalDateTime.of(2026, 7, 22, 10, 0);
        when(roomReadService.getRoomMembers(1L, 10L))
                .thenReturn(List.of(new RoomMemberResponse(
                        1L,
                        "방장",
                        true,
                        2,
                        joinedAt
                )));

        // when, then
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
                                fieldWithPath("[].joinedAt").description("게임방 참여 시각")
                        )
                ));
        verify(roomReadService).getRoomMembers(1L, 10L);
    }

    @Test
    @DisplayName("존재하지 않는 게임방의 참여자 목록을 조회하면 404 상태를 반환한다")
    void getRoomMembersRejectsMissingRoom() {
        // given
        doThrow(new CustomException(ErrorCode.ROOM_NOT_FOUND))
                .when(roomReadService)
                .getRoomMembers(1L, 10L);

        // when, then
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
        doThrow(new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN))
                .when(roomReadService)
                .getRoomMembers(1L, 10L);

        // when, then
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
        doThrow(new CustomException(ErrorCode.MEMBER_NOT_FOUND))
                .when(roomReadService)
                .getRoomMembers(1L, 10L);

        // when, then
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
    @DisplayName("게임방을 나가면 204 상태를 반환한다")
    void leaveRoomReturnsNoContent() {
        // when, then
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
        verify(roomCommandService).leaveRoom(1L, 10L);
    }

    @Test
    @DisplayName("존재하지 않는 게임방을 나가면 404 상태를 반환한다")
    void leaveRoomRejectsMissingRoom() {
        // given
        doThrow(new CustomException(ErrorCode.ROOM_NOT_FOUND))
                .when(roomCommandService)
                .leaveRoom(1L, 10L);

        // when, then
        assertLeaveRoomErrorResponse(HttpStatus.NOT_FOUND, "room-leave-room-not-found");
    }

    @Test
    @DisplayName("종료된 게임방을 나가면 409 상태를 반환한다")
    void leaveRoomRejectsClosedRoom() {
        // given
        doThrow(new CustomException(ErrorCode.ROOM_CLOSED))
                .when(roomCommandService)
                .leaveRoom(1L, 10L);

        // when, then
        assertLeaveRoomErrorResponse(HttpStatus.CONFLICT, "room-leave-closed");
    }

    @Test
    @DisplayName("게임방 참여자가 아니면 나가기에 실패한다")
    void leaveRoomRejectsNonMember() {
        // given
        doThrow(new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN))
                .when(roomCommandService)
                .leaveRoom(1L, 10L);

        // when, then
        assertLeaveRoomErrorResponse(HttpStatus.FORBIDDEN, "room-leave-forbidden");
    }

    @Test
    @DisplayName("방장이 게임방을 삭제하면 204 상태를 반환한다")
    void deleteRoomReturnsNoContent() {
        // when, then
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
        verify(roomCommandService).deleteRoom(1L, 10L);
    }

    @Test
    @DisplayName("존재하지 않는 게임방을 삭제하면 404 상태를 반환한다")
    void deleteRoomRejectsMissingRoom() {
        // given
        doThrow(new CustomException(ErrorCode.ROOM_NOT_FOUND))
                .when(roomCommandService)
                .deleteRoom(1L, 10L);

        // when, then
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
        doThrow(new CustomException(ErrorCode.ROOM_DELETE_FORBIDDEN))
                .when(roomCommandService)
                .deleteRoom(1L, 10L);

        // when, then
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
