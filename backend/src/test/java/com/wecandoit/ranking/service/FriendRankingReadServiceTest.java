package com.wecandoit.ranking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.history.repository.MemberHistoryRepository;
import com.wecandoit.history.repository.RankedWeeklyRankingSummary;
import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.ranking.controller.response.FriendRankingResponse;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@DisplayName("친구 랭킹 조회 서비스")
@ExtendWith(MockitoExtension.class)
class FriendRankingReadServiceTest {

    @Mock
    private MemberHistoryRepository memberHistoryRepository;
    @Mock
    private RankingCharacterReadService rankingCharacterReadService;
    @InjectMocks
    private FriendRankingReadService friendRankingReadService;

    @Test
    @DisplayName("페이지 경계를 넘은 동점 순위와 로그인 회원의 전체 순위를 유지한다")
    void getFriendRankingsReturnsGlobalRanksAcrossPages() {
        // given
        PageRequest pageable = PageRequest.of(1, 2);
        given(memberHistoryRepository.findPagedWeeklyFriendRankings(
                org.mockito.ArgumentMatchers.eq(4L),
                any(),
                any(),
                org.mockito.ArgumentMatchers.eq(pageable)
        )).willReturn(new PageImpl<>(
                List.of(
                        summary(1, 3L, "친구3", 20_000),
                        summary(4, 4L, "로그인회원", 12_500)
                ),
                pageable,
                5
        ));
        given(memberHistoryRepository.findWeeklyFriendRankingByMemberId(
                org.mockito.ArgumentMatchers.eq(4L),
                any(),
                any()
        )).willReturn(Optional.of(summary(4, 4L, "로그인회원", 12_500)));
        given(rankingCharacterReadService.getEquippedItemsByMemberIds(List.of(3L, 4L)))
                .willReturn(Map.of(
                        4L,
                        List.of(new EquippedItemResponse(
                                10L,
                                100L,
                                "빨간 모자",
                                ItemCategory.HAT,
                                "https://example.com/hat.png"
                        ))
                ));

        // when
        FriendRankingResponse response =
                friendRankingReadService.getFriendRankings(4L, pageable);

        // then
        assertThat(response.myRank()).isEqualTo(4);
        assertThat(response.myWeeklySteps()).isEqualTo(12_500);
        assertThat(response.rankings().content())
                .extracting("rank", "memberId")
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(1, 3L),
                        org.assertj.core.groups.Tuple.tuple(4, 4L)
                );
        assertThat(response.rankings().content().getFirst().equippedItems()).isEmpty();
        assertThat(response.rankings().content().get(1).equippedItems()).hasSize(1);
        assertThat(response.rankings().totalElements()).isEqualTo(5);
        assertThat(response.rankings().currentPage()).isEqualTo(1);
    }

    @Test
    @DisplayName("친구가 없으면 본인만 1위이자 0걸음으로 반환한다")
    void getFriendRankingsReturnsOnlyLoginMemberWithoutFriends() {
        // given
        PageRequest pageable = PageRequest.of(0, 20);
        RankedWeeklyRankingSummary loginMember = summary(1, 1L, "로그인회원", 0);
        given(memberHistoryRepository.findPagedWeeklyFriendRankings(
                org.mockito.ArgumentMatchers.eq(1L),
                any(),
                any(),
                org.mockito.ArgumentMatchers.eq(pageable)
        )).willReturn(new PageImpl<>(List.of(loginMember), pageable, 1));
        given(memberHistoryRepository.findWeeklyFriendRankingByMemberId(
                org.mockito.ArgumentMatchers.eq(1L),
                any(),
                any()
        )).willReturn(Optional.of(loginMember));

        // when
        FriendRankingResponse response =
                friendRankingReadService.getFriendRankings(1L, pageable);

        // then
        assertThat(response.myRank()).isEqualTo(1);
        assertThat(response.myWeeklySteps()).isZero();
        assertThat(response.rankings().content()).singleElement()
                .satisfies(ranking -> {
                    assertThat(ranking.memberId()).isEqualTo(1L);
                    assertThat(ranking.rank()).isEqualTo(1);
                });
        assertThat(response.rankings().totalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("로그인 회원을 찾을 수 없으면 회원 없음 예외가 발생한다")
    void getFriendRankingsRejectsMissingLoginMember() {
        // given
        PageRequest pageable = PageRequest.of(0, 20);
        given(memberHistoryRepository.findPagedWeeklyFriendRankings(
                org.mockito.ArgumentMatchers.eq(1L),
                any(),
                any(),
                org.mockito.ArgumentMatchers.eq(pageable)
        )).willReturn(new PageImpl<>(List.of(), pageable, 0));
        given(memberHistoryRepository.findWeeklyFriendRankingByMemberId(
                org.mockito.ArgumentMatchers.eq(1L),
                any(),
                any()
        )).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> friendRankingReadService.getFriendRankings(1L, pageable))
                .isInstanceOfSatisfying(CustomException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.MEMBER_NOT_FOUND));
    }

    private RankedWeeklyRankingSummary summary(
            int ranking,
            Long memberId,
            String nickname,
            long weeklySteps
    ) {
        return new RankedWeeklyRankingSummary() {
            @Override
            public int getRanking() {
                return ranking;
            }

            @Override
            public Long getMemberId() {
                return memberId;
            }

            @Override
            public String getNickname() {
                return nickname;
            }

            @Override
            public long getWeeklySteps() {
                return weeklySteps;
            }
        };
    }
}
