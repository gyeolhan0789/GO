package com.wecandoit.admin.mission.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.wecandoit.admin.mission.controller.request.CreateMissionRequest;
import com.wecandoit.admin.mission.controller.response.AdminMissionResponse;
import com.wecandoit.admin.mission.service.AdminMissionService;
import com.wecandoit.common.exception.CustomExceptionHandler;
import io.restassured.http.ContentType;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("어드민 미션 API")
class AdminMissionControllerTest {

    private final AdminMissionService adminMissionService = Mockito.mock(AdminMissionService.class);

    @BeforeEach
    void setUp() {
        RestAssuredMockMvc.mockMvc(MockMvcBuilders.standaloneSetup(new AdminMissionController(adminMissionService))
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
        // when, then
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
        verify(adminMissionService).createMission(Mockito.any(CreateMissionRequest.class));
    }

    @Test
    @DisplayName("미션 이미지 URL이 없으면 요청을 거절한다")
    void createMissionRejectsMissingMissionImageUrl() {
        // when, then
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
        verify(adminMissionService, never()).createMission(Mockito.any());
    }

    @Test
    @DisplayName("선택 필드가 없어도 요청을 수락한다")
    void createMissionAcceptsOmittedOptionalFields() {
        // when, then
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
        verify(adminMissionService).createMission(Mockito.any(CreateMissionRequest.class));
    }

    @Test
    @DisplayName("미션 목록을 조회하면 200 상태와 응답 본문을 반환한다")
    void getMissionsReturnsOk() {
        when(adminMissionService.getMissions()).thenReturn(List.of(new AdminMissionResponse(
                1L,
                "https://example.com/flower.png",
                "OBJECT",
                "Red flower",
                "Find a red flower",
                null,
                LocalDateTime.of(2026, 7, 23, 12, 0)
        )));

        given()
                .when()
                .get("/admin/missions")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("[0].missionId", org.hamcrest.Matchers.is(1));
    }
}
