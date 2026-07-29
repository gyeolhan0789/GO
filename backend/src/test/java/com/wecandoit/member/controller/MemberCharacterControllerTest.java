package com.wecandoit.member.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;

import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.item.controller.response.CharacterResponse;
import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.service.CharacterItemReadService;
import com.wecandoit.member.domain.Gender;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.BDDMockito;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.restdocs.RestDocumentationContextProvider;
import org.springframework.restdocs.RestDocumentationExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("내 캐릭터 조회 API")
@ExtendWith({RestDocumentationExtension.class, MockitoExtension.class})
class MemberCharacterControllerTest {

    @Mock
    private CharacterItemReadService characterItemReadService;

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(
                        new MemberCharacterController(characterItemReadService)
                )
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
    @DisplayName("내 캐릭터를 조회하면 회원 정보와 장착 아이템을 반환한다")
    void getMyCharacterReturnsCharacter() {
        // given
        CharacterResponse response = new CharacterResponse(
                1L,
                "테스터",
                Gender.MALE,
                "/uploads/test/characters/male/default.png",
                List.of(new EquippedItemResponse(
                        10L,
                        100L,
                        "빨간 모자",
                        ItemCategory.HAT,
                        "https://example.com/hat.png"
                ))
        );
        BDDMockito.given(characterItemReadService.getMyCharacter(1L)).willReturn(response);

        // when & then
        given()
                .when()
                .get("/members/character")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("memberId", equalTo(1))
                .body("nickname", equalTo("테스터"))
                .body("gender", equalTo("MALE"))
                .body("defaultImageUrl", equalTo("/uploads/test/characters/male/default.png"))
                .body("equippedItems[0].memberItemId", equalTo(10))
                .body("equippedItems[0].itemId", equalTo(100))
                .body("equippedItems[0].name", equalTo("빨간 모자"))
                .body("equippedItems[0].category", equalTo("HAT"))
                .body("equippedItems[0].imageUrl", equalTo("https://example.com/hat.png"))
                .apply(document("member-character-get",
                        responseFields(
                                fieldWithPath("memberId").description("회원 ID"),
                                fieldWithPath("nickname").description("회원 닉네임"),
                                fieldWithPath("gender").description("기본 캐릭터 성별"),
                                fieldWithPath("defaultImageUrl").description("기본 캐릭터 이미지 URL"),
                                fieldWithPath("equippedItems").description("장착 아이템 목록"),
                                fieldWithPath("equippedItems[].memberItemId")
                                        .description("보유 아이템 ID"),
                                fieldWithPath("equippedItems[].itemId").description("원본 아이템 ID"),
                                fieldWithPath("equippedItems[].name").description("아이템 이름"),
                                fieldWithPath("equippedItems[].category").description("장착 카테고리"),
                                fieldWithPath("equippedItems[].imageUrl").description("아이템 이미지 URL")
                        )
                ));
        BDDMockito.then(characterItemReadService).should().getMyCharacter(1L);
    }
}
