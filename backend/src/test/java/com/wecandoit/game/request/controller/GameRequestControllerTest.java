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

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.common.status.RequestStatus;
import com.wecandoit.game.request.controller.request.GameRequestCreateRequest;
import com.wecandoit.game.request.controller.response.GameRequestCreateResponse;
import com.wecandoit.game.request.service.GameRequestService;
import io.restassured.http.ContentType;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.restdocs.RestDocumentationContextProvider;
import org.springframework.restdocs.RestDocumentationExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("게임방 초대 요청 API")
@ExtendWith(RestDocumentationExtension.class)
class GameRequestControllerTest {

    private final GameRequestService gameRequestService = Mockito.mock(GameRequestService.class);

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new GameRequestController(gameRequestService))
                .setControllerAdvice(new CustomExceptionHandler())
                .setCustomArgumentResolvers(new LoginMemberIdArgumentResolver())
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
    @DisplayName("친구 초대 요청을 생성하면 201 상태와 생성 결과를 반환한다")
    void createGameRequestReturnsCreatedRequest() {
        // given
        GameRequestCreateRequest request = new GameRequestCreateRequest(2L);
        when(gameRequestService.createGameRequest(1L, 10L, request))
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
        verify(gameRequestService).createGameRequest(1L, 10L, request);
    }

    @Test
    @DisplayName("동일한 대기 중 초대가 있으면 200 상태와 기존 요청을 반환한다")
    void createGameRequestReturnsExistingRequest() {
        // given
        GameRequestCreateRequest request = new GameRequestCreateRequest(2L);
        when(gameRequestService.createGameRequest(1L, 10L, request))
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
        verify(gameRequestService).createGameRequest(1L, 10L, request);
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
        verify(gameRequestService, never()).createGameRequest(
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
        verify(gameRequestService, never()).createGameRequest(
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

    private void assertErrorResponse(ErrorCode errorCode, String documentIdentifier) {
        GameRequestCreateRequest request = new GameRequestCreateRequest(2L);
        doThrow(new CustomException(errorCode))
                .when(gameRequestService)
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
        verify(gameRequestService).createGameRequest(1L, 10L, request);
    }
}
