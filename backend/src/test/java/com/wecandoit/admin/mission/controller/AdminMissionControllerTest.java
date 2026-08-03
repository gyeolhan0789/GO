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
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "missionImageUrl": "https://example.com/flower.png",
                          "type": "OBJECT",
                          "title": "Red flower",
                          "detail": "Find a red flower",
                          "decisionCondition": {
                            "target": "flower",
                            "constraints": {
                              "color": "red"
                            }
                          }
                        }
                        """)
                .when()
                .post("/admin/missions")
                .then()
                .statusCode(HttpStatus.CREATED.value())
                .body(org.hamcrest.Matchers.isEmptyOrNullString());
        then(adminMissionCommandService).should().createMission(Mockito.any(CreateMissionRequest.class));
    }

    @Test
    @DisplayName("미션 이미지 URL이 없으면 요청을 거절한다")
    void createMissionRejectsMissingMissionImageUrl() {
        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "type": "OBJECT"
                        }
                        """)
                .when()
                .post("/admin/missions")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        then(adminMissionCommandService).should(never()).createMission(Mockito.any());
    }

    @Test
    @DisplayName("선택 필드가 없어도 요청을 수락한다")
    void createMissionAcceptsOmittedOptionalFields() {
        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "missionImageUrl": "https://example.com/flower.png",
                          "type": "RELATION"
                        }
                        """)
                .when()
                .post("/admin/missions")
                .then()
                .statusCode(HttpStatus.CREATED.value());
        then(adminMissionCommandService).should().createMission(Mockito.any(CreateMissionRequest.class));
    }

    @Test
    @DisplayName("미션 목록을 조회하면 200 상태와 응답 본문을 반환한다")
    void getMissionsReturnsOk() {
        // given
        given(adminMissionReadService.getMissions()).willReturn(List.of(new AdminMissionResponse(
                1L,
                "https://example.com/flower.png",
                "OBJECT",
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
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "missionImageUrl": "https://example.com/flower.png",
                          "type": "OBJECT",
                          "title": "Red flower",
                          "detail": "Find a red flower"
                        }
                        """)
                .when()
                .put("/admin/missions/1")
                .then()
                .statusCode(HttpStatus.NO_CONTENT.value());
        then(adminMissionCommandService).should()
                .updateMission(Mockito.eq(1L), Mockito.any(UpdateMissionRequest.class));
    }

    @Test
    @DisplayName("수정 시 미션 이미지 URL이 없으면 요청을 거절한다")
    void updateMissionRejectsMissingMissionImageUrl() {
        // when & then
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "type": "OBJECT"
                        }
                        """)
                .when()
                .put("/admin/missions/1")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value());
        then(adminMissionCommandService).should(never()).updateMission(Mockito.any(), Mockito.any());
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
}
