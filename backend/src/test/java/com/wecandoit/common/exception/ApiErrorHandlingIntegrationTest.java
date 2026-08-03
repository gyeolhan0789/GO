package com.wecandoit.common.exception;

import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.wecandoit.game.service.RoomCreateFacade;
import com.wecandoit.game.service.RoomReadService;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("API 공통 예외 처리")
class ApiErrorHandlingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoomReadService roomReadService;

    @MockitoBean
    private RoomCreateFacade roomCreateFacade;

    @Test
    @DisplayName("인증된 요청의 잘못된 enum은 400을 반환한다")
    void invalidEnumReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/rooms")
                        .queryParam("mode", "INVALID")
                        .with(authentication(memberAuthentication())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(ErrorCode.INVALID_INPUT.getMessage()));
    }

    @Test
    @DisplayName("인증된 요청의 잘못된 JSON은 400을 반환한다")
    void malformedJsonReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/rooms")
                        .with(authentication(memberAuthentication()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "테스트 방",
                                  "mode": "SINGLE"
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(ErrorCode.INVALID_INPUT.getMessage()));
    }

    @Test
    @DisplayName("인증된 요청의 잘못된 경로 변수는 400을 반환한다")
    void invalidPathVariableReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/rooms/not-a-number")
                        .with(authentication(memberAuthentication())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(ErrorCode.INVALID_INPUT.getMessage()));
    }

    @Test
    @DisplayName("처리되지 않은 DB 예외는 내부 정보를 숨기고 500을 반환한다")
    void databaseExceptionReturnsInternalServerError() throws Exception {
        given(roomReadService.getMyRooms(1L, null))
                .willThrow(new DataIntegrityViolationException("database detail"));

        mockMvc.perform(get("/rooms")
                        .with(authentication(memberAuthentication())))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.message").value(ErrorCode.INTERNAL_SERVER_ERROR.getMessage()));
    }

    @Test
    @DisplayName("인증 정보가 없는 요청만 401을 반환한다")
    void unauthenticatedRequestReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/rooms"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value(ErrorCode.UNAUTHENTICATED.getMessage()));
    }

    private Authentication memberAuthentication() {
        return UsernamePasswordAuthenticationToken.authenticated(
                1L,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
    }
}
