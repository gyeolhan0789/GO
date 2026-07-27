package com.wecandoit.ranking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.history.repository.MemberHistoryRepository;
import com.wecandoit.history.repository.WeeklyRankingSummary;
import com.wecandoit.ranking.controller.response.FriendRankingResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@DisplayName("친구 랭킹 조회 서비스")
@ExtendWith(MockitoExtension.class)
class FriendRankingReadServiceTest {

    @Mock
    private MemberHistoryRepository memberHistoryRepository;
    @InjectMocks
    private FriendRankingReadService friendRankingReadService;

    @Test
    @DisplayName("친구 집계 결과에 RANK 방식 순위를 부여하고 로그인 회원 순위를 반환한다")
    void getFriendRankingsAssignsCompetitionRanks() {
        // given
        CurrentWeekRange weekRange = CurrentWeekRange.from(LocalDate.now(ZoneId.of("Asia/Seoul")));
        given(memberHistoryRepository.findWeeklyFriendRankings(
                4L,
                weekRange.startDate(),
                weekRange.endDate()
        )).willReturn(List.of(
                summary(1L, "친구1", 20_000),
                summary(2L, "친구2", 20_000),
                summary(3L, "친구3", 15_000),
                summary(4L, "로그인회원", 12_500)
        ));

        // when
        FriendRankingResponse response = friendRankingReadService.getFriendRankings(4L);

        // then
        assertThat(response.myRank()).isEqualTo(4);
        assertThat(response.myWeeklySteps()).isEqualTo(12_500);
        assertThat(response.rankings())
                .extracting("rank")
                .containsExactly(1, 1, 3, 4);
        assertThat(response.rankings())
                .extracting("memberId")
                .containsExactly(1L, 2L, 3L, 4L);
    }

    @Test
    @DisplayName("친구가 없고 걸음 기록도 없으면 로그인 회원만 0걸음 1위로 반환한다")
    void getFriendRankingsReturnsLoginMemberFirstWhenNoFriends() {
        // given
        CurrentWeekRange weekRange = CurrentWeekRange.from(LocalDate.now(ZoneId.of("Asia/Seoul")));
        given(memberHistoryRepository.findWeeklyFriendRankings(
                1L,
                weekRange.startDate(),
                weekRange.endDate()
        )).willReturn(List.of(summary(1L, "로그인회원", 0)));

        // when
        FriendRankingResponse response = friendRankingReadService.getFriendRankings(1L);

        // then
        assertThat(response.myRank()).isEqualTo(1);
        assertThat(response.myWeeklySteps()).isZero();
        assertThat(response.rankings()).hasSize(1);
        assertThat(response.rankings().getFirst().memberId()).isEqualTo(1L);
        assertThat(response.rankings().getFirst().rank()).isEqualTo(1);
    }

    @Test
    @DisplayName("집계 결과에 로그인 회원이 없으면 회원 없음 예외가 발생한다")
    void getFriendRankingsRejectsMissingLoginMember() {
        // given
        CurrentWeekRange weekRange = CurrentWeekRange.from(LocalDate.now(ZoneId.of("Asia/Seoul")));
        given(memberHistoryRepository.findWeeklyFriendRankings(
                1L,
                weekRange.startDate(),
                weekRange.endDate()
        )).willReturn(List.of());

        // when & then
        assertThatThrownBy(() -> friendRankingReadService.getFriendRankings(1L))
                .isInstanceOfSatisfying(CustomException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.MEMBER_NOT_FOUND));
    }

    private WeeklyRankingSummary summary(Long memberId, String nickname, long weeklySteps) {
        return new WeeklyRankingSummary() {
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
