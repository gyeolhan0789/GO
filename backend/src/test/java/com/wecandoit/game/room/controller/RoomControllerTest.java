package com.wecandoit.game.room.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.game.controller.RoomController;
import com.wecandoit.game.controller.request.CreateRoomRequest;
import com.wecandoit.game.controller.request.UpdateRoomNameRequest;
import com.wecandoit.game.controller.response.MyRoomMemberResponse;
import com.wecandoit.game.controller.response.MyRoomResponse;
import com.wecandoit.game.controller.response.RoomDetailResponse;
import com.wecandoit.game.controller.response.RoomMemberResponse;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.service.RoomCommandService;
import com.wecandoit.game.service.RoomCreateFacade;
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

    @Mock
    private RoomCommandService roomCommandService;

    @Mock
    private RoomReadService roomReadService;

    @Mock
    private RoomCreateFacade roomCreateFacade;

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(
                        new RoomController(roomCommandService, roomReadService, roomCreateFacade))
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
                .apply(document("room-detail",
                        pathParameters(
                                parameterWithName("roomId").description("게임방 ID")
                        ),
                        responseFields(roomDetailFields())
                ));
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
                List.of(new RoomMemberResponse(1L, "방장", true, 2, startedAt, null))
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
                List.of(new MyRoomMemberResponse(1L, "방장", true))
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
                fieldWithPath("members[].host").description("방장 여부"),
                fieldWithPath("members[].completedMissionCount").description("현재 회차 완료 미션 수"),
                fieldWithPath("members[].joinedAt").description("현재 방 참여 시각"),
                fieldWithPath("members[].bingoBoardId").description("대결 개인 빙고판 ID")
        };
    }
}
