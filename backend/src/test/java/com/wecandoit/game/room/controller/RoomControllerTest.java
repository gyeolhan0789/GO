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
        CreateRoomRequest request = new CreateRoomRequest(GameMode.SINGLE, 3);
        when(roomCommandService.createRoom(1L, request))
                .thenReturn(new CreateRoomResponse(10L, GameRoomStatus.CREATED));

        // when, then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "mode": "SINGLE",
                          "targetBingoCount": 3
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
                                fieldWithPath("targetBingoCount").description("목표 빙고 수")
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
                          "targetBingoCount": 0
                        }
                        """)
                .when()
                .post("/rooms")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        verify(roomCommandService, never()).createRoom(Mockito.anyLong(), Mockito.any());
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
}
