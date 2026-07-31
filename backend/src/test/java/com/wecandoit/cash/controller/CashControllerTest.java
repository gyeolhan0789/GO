package com.wecandoit.cash.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;

import com.wecandoit.cash.controller.response.CashResponse;
import com.wecandoit.cash.service.CashReadService;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.BDDMockito;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.restdocs.RestDocumentationContextProvider;
import org.springframework.restdocs.RestDocumentationExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith({RestDocumentationExtension.class, MockitoExtension.class})
class CashControllerTest {

    @Mock
    private CashReadService cashReadService;

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new CashController(cashReadService))
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
    void returnsTheAuthenticatedMembersCash() {
        BDDMockito.given(cashReadService.getCash(1L)).willReturn(CashResponse.of(0L));

        given()
                .when()
                .get("/members/cash")
                .then()
                .statusCode(200)
                .body("cash", equalTo(0))
                .apply(document("cash-get",
                        responseFields(
                                fieldWithPath("cash").description("현재 캐시 잔액")
                        )
                ));
        BDDMockito.then(cashReadService).should().getCash(1L);
    }
}
