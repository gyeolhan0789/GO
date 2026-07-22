package com.wecandoit.mission.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.mission.controller.request.CreateMissionRequest;
import com.wecandoit.mission.service.MissionService;
import io.restassured.http.ContentType;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("어드민 미션 API")
class MissionControllerTest {

    private final MissionService missionService = Mockito.mock(MissionService.class);

    @BeforeEach
    void setUp() {
        RestAssuredMockMvc.mockMvc(MockMvcBuilders.standaloneSetup(new MissionController(missionService))
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
        verify(missionService).createMission(Mockito.any(CreateMissionRequest.class));
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
        verify(missionService, never()).createMission(Mockito.any());
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
        verify(missionService).createMission(Mockito.any(CreateMissionRequest.class));
    }
}
