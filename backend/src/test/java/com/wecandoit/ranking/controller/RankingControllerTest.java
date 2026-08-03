package com.wecandoit.ranking.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.documentationConfiguration;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.CustomExceptionHandler;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.PageResponse;
import com.wecandoit.common.security.LoginMemberIdArgumentResolver;
import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Region;
import com.wecandoit.ranking.controller.response.FriendRankingResponse;
import com.wecandoit.ranking.controller.response.RankingItemResponse;
import com.wecandoit.ranking.controller.response.RankingResponse;
import com.wecandoit.ranking.service.FriendRankingReadService;
import com.wecandoit.ranking.service.RankingReadService;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
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
    private MockMvc mockMvc;

    @BeforeEach
    void setUp(RestDocumentationContextProvider restDocumentation) {
        mockMvc = MockMvcBuilders.standaloneSetup(
                        new RankingController(rankingReadService, friendRankingReadService)
                )
                .setControllerAdvice(new CustomExceptionHandler())
                .setCustomArgumentResolvers(
                        new LoginMemberIdArgumentResolver(),
                        new PageableHandlerMethodArgumentResolver()
                )
                .apply(documentationConfiguration(restDocumentation))
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(1L, null, List.of())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("지역 랭킹을 PageResponse 구조로 반환한다")
    void getRankingsReturnsPagedRegionalRankings() throws Exception {
        // given
        PageRequest pageable = PageRequest.of(1, 2);
        given(rankingReadService.getRankings(1L, pageable)).willReturn(new RankingResponse(
                Region.SEOUL,
                3,
                12_500,
                new PageResponse<>(
                        List.of(new RankingItemResponse(
                                3,
                                1L,
                                "me",
                                12_500,
                                Gender.FEMALE,
                                "/uploads/avatars/female/default.png",
                                List.of(new EquippedItemResponse(
                                        10L,
                                        100L,
                                        "빨간 모자",
                                        ItemCategory.HAT,
                                        "https://example.com/hat.png"
                                ))
                        )),
                        5,
                        3,
                        1,
                        2,
                        true
                )
        ));

        // when & then
        mockMvc.perform(get("/rankings").param("page", "1").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.region").value("SEOUL"))
                .andExpect(jsonPath("$.myRank").value(3))
                .andExpect(jsonPath("$.myWeeklySteps").value(12_500))
                .andExpect(jsonPath("$.rankings.content[0].rank").value(3))
                .andExpect(jsonPath("$.rankings.content[0].memberId").value(1L))
                .andExpect(jsonPath("$.rankings.content[0].gender").value("FEMALE"))
                .andExpect(jsonPath("$.rankings.content[0].defaultImageUrl")
                        .value("/uploads/avatars/female/default.png"))
                .andExpect(jsonPath("$.rankings.content[0].equippedItems[0].memberItemId")
                        .value(10L))
                .andExpect(jsonPath("$.rankings.content[0].equippedItems[0].itemId")
                        .value(100L))
                .andExpect(jsonPath("$.rankings.content[0].equippedItems[0].name")
                        .value("빨간 모자"))
                .andExpect(jsonPath("$.rankings.content[0].equippedItems[0].category")
                        .value("HAT"))
                .andExpect(jsonPath("$.rankings.content[0].equippedItems[0].imageUrl")
                        .value("https://example.com/hat.png"))
                .andExpect(jsonPath("$.rankings.totalElements").value(5))
                .andExpect(jsonPath("$.rankings.totalPages").value(3))
                .andExpect(jsonPath("$.rankings.currentPage").value(1))
                .andExpect(jsonPath("$.rankings.size").value(2))
                .andExpect(jsonPath("$.rankings.hasNext").value(true))
                .andDo(document(
                        "ranking-list",
                        queryParameters(
                                parameterWithName("page").description("페이지 번호"),
                                parameterWithName("size").description("페이지 크기")
                        ),
                        responseFields(
                                fieldWithPath("region").description("로그인 회원의 지역"),
                                fieldWithPath("myRank").description("로그인 회원의 전체 순위"),
                                fieldWithPath("myWeeklySteps")
                                        .description("로그인 회원의 이번 주 걸음 수"),
                                fieldWithPath("rankings.content[].rank").description("전체 순위"),
                                fieldWithPath("rankings.content[].memberId").description("회원 ID"),
                                fieldWithPath("rankings.content[].nickname")
                                        .description("회원 닉네임"),
                                fieldWithPath("rankings.content[].weeklySteps")
                                        .description("이번 주 걸음 수"),
                                fieldWithPath("rankings.content[].gender")
                                        .description("회원 아바타 성별"),
                                fieldWithPath("rankings.content[].defaultImageUrl")
                                        .description("성별 기본 아바타 이미지 URL"),
                                fieldWithPath("rankings.content[].equippedItems")
                                        .description("장착 아이템 목록"),
                                fieldWithPath("rankings.content[].equippedItems[].memberItemId")
                                        .description("회원 보유 아이템 ID"),
                                fieldWithPath("rankings.content[].equippedItems[].itemId")
                                        .description("원본 아이템 ID"),
                                fieldWithPath("rankings.content[].equippedItems[].name")
                                        .description("아이템 이름"),
                                fieldWithPath("rankings.content[].equippedItems[].category")
                                        .description("장착 카테고리"),
                                fieldWithPath("rankings.content[].equippedItems[].imageUrl")
                                        .description("아이템 이미지 URL"),
                                fieldWithPath("rankings.totalElements")
                                        .description("전체 랭킹 대상 수"),
                                fieldWithPath("rankings.totalPages").description("전체 페이지 수"),
                                fieldWithPath("rankings.currentPage").description("현재 페이지"),
                                fieldWithPath("rankings.size").description("페이지 크기"),
                                fieldWithPath("rankings.hasNext").description("다음 페이지 존재 여부")
                        )
                ));
        then(rankingReadService).should().getRankings(1L, pageable);
    }

    @Test
    @DisplayName("친구 랭킹을 PageResponse 구조로 반환한다")
    void getFriendRankingsReturnsPagedFriendRankings() throws Exception {
        // given
        PageRequest pageable = PageRequest.of(0, 20);
        given(friendRankingReadService.getFriendRankings(1L, pageable))
                .willReturn(new FriendRankingResponse(
                        2,
                        12_500,
                        new PageResponse<>(
                                List.of(new RankingItemResponse(
                                        1,
                                        2L,
                                        "친구",
                                        20_000,
                                        Gender.MALE,
                                        "/uploads/avatars/male/default.png",
                                        List.of()
                                )),
                                2,
                                1,
                                0,
                                20,
                                false
                        )
                ));

        // when & then
        mockMvc.perform(get("/rankings/friends").param("page", "0").param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.myRank").value(2))
                .andExpect(jsonPath("$.myWeeklySteps").value(12_500))
                .andExpect(jsonPath("$.rankings.content[0].rank").value(1))
                .andExpect(jsonPath("$.rankings.content[0].memberId").value(2L))
                .andExpect(jsonPath("$.rankings.content[0].gender").value("MALE"))
                .andExpect(jsonPath("$.rankings.content[0].defaultImageUrl")
                        .value("/uploads/avatars/male/default.png"))
                .andExpect(jsonPath("$.rankings.content[0].equippedItems").isArray())
                .andExpect(jsonPath("$.rankings.content[0].equippedItems").isEmpty())
                .andExpect(jsonPath("$.rankings.totalElements").value(2))
                .andExpect(jsonPath("$.rankings.totalPages").value(1))
                .andExpect(jsonPath("$.rankings.currentPage").value(0))
                .andExpect(jsonPath("$.rankings.size").value(20))
                .andExpect(jsonPath("$.rankings.hasNext").value(false))
                .andDo(document(
                        "friend-ranking-list",
                        queryParameters(
                                parameterWithName("page").description("페이지 번호"),
                                parameterWithName("size").description("페이지 크기")
                        ),
                        responseFields(
                                fieldWithPath("myRank").description("로그인 회원의 전체 순위"),
                                fieldWithPath("myWeeklySteps")
                                        .description("로그인 회원의 이번 주 걸음 수"),
                                fieldWithPath("rankings.content[].rank").description("전체 순위"),
                                fieldWithPath("rankings.content[].memberId").description("회원 ID"),
                                fieldWithPath("rankings.content[].nickname")
                                        .description("회원 닉네임"),
                                fieldWithPath("rankings.content[].weeklySteps")
                                        .description("이번 주 걸음 수"),
                                fieldWithPath("rankings.content[].gender")
                                        .description("회원 아바타 성별"),
                                fieldWithPath("rankings.content[].defaultImageUrl")
                                        .description("성별 기본 아바타 이미지 URL"),
                                fieldWithPath("rankings.content[].equippedItems")
                                        .description("장착 아이템 목록"),
                                fieldWithPath("rankings.totalElements")
                                        .description("전체 랭킹 대상 수"),
                                fieldWithPath("rankings.totalPages").description("전체 페이지 수"),
                                fieldWithPath("rankings.currentPage").description("현재 페이지"),
                                fieldWithPath("rankings.size").description("페이지 크기"),
                                fieldWithPath("rankings.hasNext").description("다음 페이지 존재 여부")
                        )
                ));
        then(friendRankingReadService).should().getFriendRankings(1L, pageable);
    }

    @Test
    @DisplayName("지역이 없는 회원의 지역 랭킹 요청은 400을 반환한다")
    void getRankingsRejectsMemberWithoutRegion() throws Exception {
        // given
        given(rankingReadService.getRankings(eq(1L), any()))
                .willThrow(new CustomException(ErrorCode.MEMBER_REGION_NOT_SET));

        // when & then
        mockMvc.perform(get("/rankings"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    @DisplayName("인증되지 않은 랭킹 요청은 401을 반환한다")
    void getRankingsRejectsUnauthenticatedRequest() throws Exception {
        // given
        SecurityContextHolder.clearContext();

        // when & then
        mockMvc.perform(get("/rankings"))
                .andExpect(status().isUnauthorized());
        then(rankingReadService).should(never()).getRankings(any(), any());
    }
}
