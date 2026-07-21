package com.wecandoit.game.room.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;

import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.game.room.controller.request.CreateRoomRequest;
import com.wecandoit.game.room.controller.response.CreateRoomResponse;
import com.wecandoit.game.room.domain.GameMode;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.service.RoomService;
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

@DisplayName("게임방 API")
@ExtendWith(RestDocumentationExtension.class)
class RoomControllerTest {

    private final RoomService roomService = Mockito.mock(RoomService.class);

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new RoomController(roomService))
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
    @DisplayName("게임방을 생성하면 생성된 방 ID와 상태를 반환한다")
    void createRoomReturnsCreatedRoom() {
        // given
        CreateRoomRequest request = new CreateRoomRequest(GameMode.SINGLE, 3);
        when(roomService.createRoom(1L, request))
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
        verify(roomService).createRoom(1L, request);
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
        verify(roomService, never()).createRoom(Mockito.anyLong(), Mockito.any());
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
        verify(roomService, never()).createRoom(Mockito.anyLong(), Mockito.any());
    }
}
