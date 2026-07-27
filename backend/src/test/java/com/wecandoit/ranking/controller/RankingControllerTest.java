package com.wecandoit.ranking.controller;

import static io.restassured.module.mockmvc.RestAssuredMockMvc.given;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.member.domain.Region;
import com.wecandoit.ranking.controller.response.FriendRankingResponse;
import com.wecandoit.ranking.controller.response.RankingItemResponse;
import com.wecandoit.ranking.controller.response.RankingResponse;
import com.wecandoit.ranking.service.FriendRankingReadService;
import com.wecandoit.ranking.service.RankingReadService;
import io.restassured.module.mockmvc.RestAssuredMockMvc;
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
import org.springframework.restdocs.RestDocumentationContextProvider;
import org.springframework.restdocs.RestDocumentationExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("랭킹 API")
@ExtendWith({RestDocumentationExtension.class, MockitoExtension.class})
class RankingControllerTest {

    @Mock
    private RankingReadService rankingReadService;
    @Mock
    private FriendRankingReadService friendRankingReadService;

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new RankingController(
                        rankingReadService,
                        friendRankingReadService
                ))
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
    @DisplayName("로그인 회원의 지역 랭킹을 반환한다")
    void getRankingsReturnsRegionalRankings() {
        // given
        RankingResponse response = new RankingResponse(
                Region.SEOUL,
                3,
                12_500,
                List.of(
                        new RankingItemResponse(1, 2L, "walker1", 20_000),
                        new RankingItemResponse(1, 3L, "walker2", 20_000),
                        new RankingItemResponse(3, 1L, "me", 12_500)
                )
        );
        org.mockito.BDDMockito.given(rankingReadService.getRankings(1L)).willReturn(response);

        // when & then
        given()
                .when()
                .get("/rankings")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("region", equalTo("SEOUL"))
                .body("myRank", equalTo(3))
                .body("myWeeklySteps", equalTo(12_500))
                .body("rankings[0].rank", equalTo(1))
                .body("rankings[0].memberId", equalTo(2))
                .body("rankings[0].nickname", equalTo("walker1"))
                .body("rankings[0].weeklySteps", equalTo(20_000))
                .apply(document("ranking-list",
                        responseFields(
                                fieldWithPath("region").description("로그인 회원의 지역"),
                                fieldWithPath("myRank").description("로그인 회원의 지역 내 순위"),
                                fieldWithPath("myWeeklySteps").description("로그인 회원의 이번 주 걸음 수"),
                                fieldWithPath("rankings[].rank").description("지역 내 순위"),
                                fieldWithPath("rankings[].memberId").description("회원 ID"),
                                fieldWithPath("rankings[].nickname").description("회원 닉네임"),
                                fieldWithPath("rankings[].weeklySteps").description("이번 주 걸음 수")
                        )
                ));
        then(rankingReadService).should().getRankings(1L);
    }

    @Test
    @DisplayName("지역을 설정하지 않은 회원은 400 응답을 받는다")
    void getRankingsRejectsMemberWithoutRegion() {
        // given
        org.mockito.BDDMockito.given(rankingReadService.getRankings(1L))
                .willThrow(new CustomException(ErrorCode.MEMBER_REGION_NOT_SET));

        // when & then
        given()
                .when()
                .get("/rankings")
                .then()
                .statusCode(HttpStatus.BAD_REQUEST.value())
                .body("status", equalTo(400))
                .body("message", equalTo("지역을 설정해야 랭킹을 확인할 수 있습니다."))
                .apply(document("ranking-list-region-not-set",
                        responseFields(
                                fieldWithPath("status").description("HTTP 상태 코드"),
                                fieldWithPath("message").description("오류 메시지")
                        )
                ));
    }

    @Test
    @DisplayName("인증되지 않은 요청은 401 응답을 받는다")
    void getRankingsRejectsUnauthenticatedRequest() {
        // given
        SecurityContextHolder.clearContext();

        // when & then
        given()
                .when()
                .get("/rankings")
                .then()
                .statusCode(HttpStatus.UNAUTHORIZED.value())
                .body("status", equalTo(401))
                .body("message", equalTo("인증이 필요합니다."));
        then(rankingReadService).should(never()).getRankings(Mockito.anyLong());
    }

    @Test
    @DisplayName("로그인 회원과 친구의 주간 랭킹을 반환한다")
    void getFriendRankingsReturnsRankings() {
        // given
        FriendRankingResponse response = new FriendRankingResponse(
                2,
                12_500,
                List.of(
                        new RankingItemResponse(1, 2L, "친구", 20_000),
                        new RankingItemResponse(2, 1L, "로그인회원", 12_500)
                )
        );
        org.mockito.BDDMockito.given(friendRankingReadService.getFriendRankings(1L))
                .willReturn(response);

        // when & then
        given()
                .when()
                .get("/rankings/friends")
                .then()
                .statusCode(HttpStatus.OK.value())
                .body("myRank", equalTo(2))
                .body("myWeeklySteps", equalTo(12_500))
                .body("rankings[0].rank", equalTo(1))
                .body("rankings[0].memberId", equalTo(2))
                .body("rankings[0].nickname", equalTo("친구"))
                .body("rankings[0].weeklySteps", equalTo(20_000))
                .apply(document("friend-ranking-list",
                        responseFields(
                                fieldWithPath("myRank").description("로그인 회원의 친구 랭킹 순위"),
                                fieldWithPath("myWeeklySteps").description("로그인 회원의 이번 주 걸음 수"),
                                fieldWithPath("rankings[].rank").description("친구 랭킹 순위"),
                                fieldWithPath("rankings[].memberId").description("회원 ID"),
                                fieldWithPath("rankings[].nickname").description("회원 닉네임"),
                                fieldWithPath("rankings[].weeklySteps").description("이번 주 걸음 수")
                        )
                ));
        then(friendRankingReadService).should().getFriendRankings(1L);
    }

    @Test
    @DisplayName("인증되지 않은 친구 랭킹 요청은 401 응답을 받는다")
    void getFriendRankingsRejectsUnauthenticatedRequest() {
        // given
        SecurityContextHolder.clearContext();

        // when & then
        given()
                .when()
                .get("/rankings/friends")
                .then()
                .statusCode(HttpStatus.UNAUTHORIZED.value())
                .body("status", equalTo(401))
                .body("message", equalTo("인증이 필요합니다."));
        then(friendRankingReadService).should(never()).getFriendRankings(Mockito.anyLong());
    }
}
