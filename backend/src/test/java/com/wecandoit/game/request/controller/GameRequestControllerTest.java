package com.wecandoit.game.request.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.common.status.RequestStatus;
import com.wecandoit.game.request.controller.request.GameRequestCreateRequest;
import com.wecandoit.game.request.controller.response.GameRequestCreateResponse;
import com.wecandoit.game.request.controller.response.ReceivedGameRequestResponse;
import com.wecandoit.game.request.service.GameRequestCommandService;
import com.wecandoit.game.request.service.GameRequestReadService;
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

@DisplayName("게임방 초대 요청 API")
@ExtendWith(RestDocumentationExtension.class)
class GameRequestControllerTest {

    private static final String ACCEPT_ACTION = "accept";
    private static final String REJECT_ACTION = "reject";

    private final GameRequestCommandService gameRequestCommandService = Mockito.mock(GameRequestCommandService.class);
    private final GameRequestReadService gameRequestReadService = Mockito.mock(GameRequestReadService.class);

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );

        MockMvc mockMvc = MockMvcBuilders
                .standaloneSetup(new GameRequestController(gameRequestCommandService, gameRequestReadService))
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
    @DisplayName("받은 게임방 초대 요청 목록을 조회하면 200 상태와 대기 중 초대 목록을 반환한다")
    void getReceivedGameRequestsReturnsPendingRequests() {
        // given
        LocalDateTime createdAt = LocalDateTime.of(2026, 7, 22, 10, 0);
        when(gameRequestReadService.getReceivedGameRequests(1L))
                .thenReturn(List.of(new ReceivedGameRequestResponse(
                        20L,
                        10L,
                        2L,
                        "초대자",
                        RequestStatus.PENDING,
                        createdAt
                )));

        // when, then
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
        verify(gameRequestReadService).getReceivedGameRequests(1L);
    }

    @Test
    @DisplayName("친구 초대 요청을 생성하면 201 상태와 생성 결과를 반환한다")
    void createGameRequestReturnsCreatedRequest() {
        // given
        GameRequestCreateRequest request = new GameRequestCreateRequest(2L);
        when(gameRequestCommandService.createGameRequest(1L, 10L, request))
                .thenReturn(new GameRequestCreateResponse(20L, RequestStatus.PENDING, true));

        // when, then
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
                                parameterWithName("roomId").description("초대할 게임방 ID")
                        ),
                        requestFields(
                                fieldWithPath("inviteeId").description("초대받을 친구 회원 ID")
                        ),
                        responseFields(
                                fieldWithPath("requestId").description("게임방 초대 요청 ID"),
                                fieldWithPath("status").description("게임방 초대 요청 상태"),
                                fieldWithPath("created").description("신규 생성 여부")
                        )
                ));
        verify(gameRequestCommandService).createGameRequest(1L, 10L, request);
    }

    @Test
    @DisplayName("동일한 대기 중 초대가 있으면 200 상태와 기존 요청을 반환한다")
    void createGameRequestReturnsExistingRequest() {
        // given
        GameRequestCreateRequest request = new GameRequestCreateRequest(2L);
        when(gameRequestCommandService.createGameRequest(1L, 10L, request))
                .thenReturn(new GameRequestCreateResponse(20L, RequestStatus.PENDING, false));

        // when, then
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
                                parameterWithName("roomId").description("초대할 게임방 ID")
                        ),
                        requestFields(
                                fieldWithPath("inviteeId").description("초대받을 친구 회원 ID")
                        ),
                        responseFields(
                                fieldWithPath("requestId").description("기존 게임방 초대 요청 ID"),
                                fieldWithPath("status").description("게임방 초대 요청 상태"),
                                fieldWithPath("created").description("신규 생성 여부")
                        )
                ));
        verify(gameRequestCommandService).createGameRequest(1L, 10L, request);
    }

    @Test
    @DisplayName("초대할 회원 ID가 없으면 400 상태를 반환한다")
    void createGameRequestRejectsMissingInviteeId() {
        // when, then
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
        verify(gameRequestCommandService, never()).createGameRequest(
                Mockito.anyLong(),
                Mockito.anyLong(),
                Mockito.any()
        );
    }

    @Test
    @DisplayName("초대할 회원 ID가 양수가 아니면 400 상태를 반환한다")
    void createGameRequestRejectsInvalidInviteeId() {
        // when, then
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
        verify(gameRequestCommandService, never()).createGameRequest(
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
        // when, then
        given()
                .when()
                .patch("/rooms/{roomId}/requests/{requestId}/accept", 10L, 20L)
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value())
                .apply(document("game-request-accept",
                        pathParameters(
                                parameterWithName("roomId").description("초대를 수락할 게임방 ID"),
                                parameterWithName("requestId").description("수락할 게임방 초대 요청 ID")
                        )
                ));
        verify(gameRequestCommandService).acceptGameRequest(1L, 10L, 20L);
    }

    @Test
    @DisplayName("게임방 초대 요청을 거절하면 204 상태를 반환한다")
    void rejectGameRequestReturnsNoContent() {
        // when, then
        given()
                .when()
                .patch("/rooms/{roomId}/requests/{requestId}/reject", 10L, 20L)
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value())
                .apply(document("game-request-reject",
                        pathParameters(
                                parameterWithName("roomId").description("초대를 거절할 게임방 ID"),
                                parameterWithName("requestId").description("거절할 게임방 초대 요청 ID")
                        )
                ));
        verify(gameRequestCommandService).rejectGameRequest(1L, 10L, 20L);
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

    private void assertErrorResponse(ErrorCode errorCode, String documentIdentifier) {
        GameRequestCreateRequest request = new GameRequestCreateRequest(2L);
        doThrow(new CustomException(errorCode))
                .when(gameRequestCommandService)
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
        verify(gameRequestCommandService).createGameRequest(1L, 10L, request);
    }

    private void assertProcessErrorResponse(ErrorCode errorCode, String documentIdentifier, String action) {
        if (ACCEPT_ACTION.equals(action)) {
            doThrow(new CustomException(errorCode))
                    .when(gameRequestCommandService)
                    .acceptGameRequest(1L, 10L, 20L);
        } else {
            doThrow(new CustomException(errorCode))
                    .when(gameRequestCommandService)
                    .rejectGameRequest(1L, 10L, 20L);
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
            verify(gameRequestCommandService).acceptGameRequest(1L, 10L, 20L);
        } else {
            verify(gameRequestCommandService).rejectGameRequest(1L, 10L, 20L);
        }
    }
}
