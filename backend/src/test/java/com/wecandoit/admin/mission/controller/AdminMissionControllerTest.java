package com.wecandoit.admin.mission.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.wecandoit.admin.mission.controller.request.CreateMissionRequest;
import com.wecandoit.admin.mission.controller.request.UpdateMissionRequest;
import com.wecandoit.admin.mission.controller.response.AdminMissionResponse;
import com.wecandoit.admin.mission.service.AdminMissionCommandService;
import com.wecandoit.admin.mission.service.AdminMissionReadService;
import com.wecandoit.common.exception.CustomExceptionHandler;
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
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("어드민 미션 API")
@ExtendWith(MockitoExtension.class)
class AdminMissionControllerTest {

    @Mock
    private AdminMissionCommandService adminMissionCommandService;
    @Mock
    private AdminMissionReadService adminMissionReadService;

    @BeforeEach
    void setUp() {
        RestAssuredMockMvc.mockMvc(MockMvcBuilders.standaloneSetup(
                        new AdminMissionController(adminMissionCommandService, adminMissionReadService))
                .setControllerAdvice(new CustomExceptionHandler())
                .build());
    }

    @AfterEach
    void tearDown() {
        RestAssuredMockMvc.reset();
    }

    @Test
    @DisplayName("미션을 생성하면 201 상태와 빈 본문을 반환한다")
    void createMissionReturnsCreated() {
        // when & then
        given()
                .formParam("type", "OBJECT")
                .formParam("difficulty", "LOW")
                .formParam("title", "Red flower")
                .formParam("detail", "Find a red flower")
                .formParam("decisionCondition", "{\"target\":\"flower\",\"constraints\":{\"color\":\"red\"}}")
                .multiPart("image", "flower.png", "png-bytes".getBytes(), "image/png")
                .when()
                .post("/admin/missions")
                .then()
                .statusCode(HttpStatus.CREATED.value())
                .body(org.hamcrest.Matchers.isEmptyOrNullString());
        then(adminMissionCommandService).should()
                .createMission(Mockito.any(CreateMissionRequest.class), Mockito.any());
    }

    @Test
    @DisplayName("미션 이미지가 없으면 요청을 거절한다")
    void createMissionRejectsMissingImage() {
        // when & then
        given()
                .formParam("type", "OBJECT")
                .multiPart("placeholder", "value")
                .when()
                .post("/admin/missions")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        then(adminMissionCommandService).should(never()).createMission(Mockito.any(), Mockito.any());
    }

    @Test
    @DisplayName("선택 필드가 없어도 요청을 수락한다")
    void createMissionAcceptsOmittedOptionalFields() {
        // when & then
        given()
                .formParam("type", "RELATION")
                .formParam("difficulty", "HIGH")
                .multiPart("image", "flower.png", "png-bytes".getBytes(), "image/png")
                .when()
                .post("/admin/missions")
                .then()
                .statusCode(HttpStatus.CREATED.value());
        then(adminMissionCommandService).should()
                .createMission(Mockito.any(CreateMissionRequest.class), Mockito.any());
    }

    @Test
    @DisplayName("미션 목록을 조회하면 200 상태와 응답 본문을 반환한다")
    void getMissionsReturnsOk() {
        // given
        given(adminMissionReadService.getMissions()).willReturn(List.of(new AdminMissionResponse(
                1L,
                "https://example.com/flower.png",
                "OBJECT",
                "LOW",
                "Red flower",
                "Find a red flower",
                null,
                true,
                LocalDateTime.of(2026, 7, 23, 12, 0)
        )));

        // when & then
        given()
                .when()
                .get("/admin/missions")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("[0].missionId", org.hamcrest.Matchers.is(1));
    }

    @Test
    @DisplayName("미션을 수정하면 204 상태를 반환한다")
    void updateMissionReturnsNoContent() {
        // when & then
        given()
                .formParam("type", "OBJECT")
                .formParam("difficulty", "LOW")
                .formParam("title", "Red flower")
                .formParam("detail", "Find a red flower")
                .multiPart("placeholder", "value")
                .when()
                .put("/admin/missions/1")
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value());
        then(adminMissionCommandService).should()
                .updateMission(Mockito.eq(1L), Mockito.any(UpdateMissionRequest.class), Mockito.any());
    }

    @Test
    @DisplayName("수정 시 미션 타입이 없으면 요청을 거절한다")
    void updateMissionRejectsMissingType() {
        // when & then
        given()
                .multiPart("placeholder", "value")
                .when()
                .put("/admin/missions/1")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        then(adminMissionCommandService).should(never()).updateMission(Mockito.any(), Mockito.any(), Mockito.any());
    }

    @Test
    @DisplayName("미션을 삭제하면 204 상태를 반환한다")
    void deactivateMissionReturnsNoContent() {
        // when & then
        given()
                .when()
                .delete("/admin/missions/1")
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value());
        then(adminMissionCommandService).should().deactivateMission(1L);
    }

    @Test
    @DisplayName("미션을 활성화하면 204 상태를 반환한다")
    void activateMissionReturnsNoContent() {
        // when & then
        given()
                .when()
                .patch("/admin/missions/1/activate")
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value());
        then(adminMissionCommandService).should().activateMission(1L);
    }
}
