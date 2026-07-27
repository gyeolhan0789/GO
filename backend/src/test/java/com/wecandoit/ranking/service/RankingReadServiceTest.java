package com.wecandoit.ranking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.history.repository.MemberHistoryRepository;
import com.wecandoit.history.repository.WeeklyRankingSummary;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.domain.Region;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.ranking.controller.response.RankingResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("랭킹 조회 서비스")
@ExtendWith(MockitoExtension.class)
class RankingReadServiceTest {

    @Mock
    private MemberRepository memberRepository;
    @Mock
    private MemberHistoryRepository memberHistoryRepository;
    @InjectMocks
    private RankingReadService rankingReadService;

    @Test
    @DisplayName("로그인 회원의 지역 집계 결과에 RANK 방식 순위를 부여한다")
    void getRankingsAssignsCompetitionRanks() {
        // given
        Member loginMember = member(4L, "로그인회원", Region.SEOUL);
        CurrentWeekRange weekRange = CurrentWeekRange.from(LocalDate.now(ZoneId.of("Asia/Seoul")));
        given(memberRepository.findById(4L)).willReturn(Optional.of(loginMember));
        given(memberHistoryRepository.findWeeklyRankingsByRegion(
                Region.SEOUL,
                weekRange.startDate(),
                weekRange.endDate()
        )).willReturn(List.of(
                summary(1L, "회원1", 20_000),
                summary(2L, "회원2", 20_000),
                summary(3L, "회원3", 20_000),
                summary(4L, "로그인회원", 12_500),
                summary(5L, "회원5", 0)
        ));

        // when
        RankingResponse response = rankingReadService.getRankings(4L);

        // then
        assertThat(response.region()).isEqualTo(Region.SEOUL);
        assertThat(response.myRank()).isEqualTo(4);
        assertThat(response.myWeeklySteps()).isEqualTo(12_500);
        assertThat(response.rankings())
                .extracting("rank")
                .containsExactly(1, 1, 1, 4, 5);
        assertThat(response.rankings())
                .extracting("memberId")
                .containsExactly(1L, 2L, 3L, 4L, 5L);
    }

    @Test
    @DisplayName("모든 회원이 0걸음이면 모두 1위로 반환한다")
    void getRankingsReturnsAllMembersFirstWhenStepsAreZero() {
        // given
        Member loginMember = member(2L, "로그인회원", Region.BUSAN);
        CurrentWeekRange weekRange = CurrentWeekRange.from(LocalDate.now(ZoneId.of("Asia/Seoul")));
        given(memberRepository.findById(2L)).willReturn(Optional.of(loginMember));
        given(memberHistoryRepository.findWeeklyRankingsByRegion(
                Region.BUSAN,
                weekRange.startDate(),
                weekRange.endDate()
        )).willReturn(List.of(
                summary(1L, "회원1", 0),
                summary(2L, "로그인회원", 0),
                summary(3L, "회원3", 0)
        ));

        // when
        RankingResponse response = rankingReadService.getRankings(2L);

        // then
        assertThat(response.myRank()).isEqualTo(1);
        assertThat(response.myWeeklySteps()).isZero();
        assertThat(response.rankings())
                .extracting("rank")
                .containsExactly(1, 1, 1);
    }

    @Test
    @DisplayName("같은 지역 회원이 본인뿐이면 1위로 반환한다")
    void getRankingsReturnsLoginMemberFirstWhenAlone() {
        // given
        Member loginMember = member(1L, "로그인회원", Region.JEJU);
        CurrentWeekRange weekRange = CurrentWeekRange.from(LocalDate.now(ZoneId.of("Asia/Seoul")));
        given(memberRepository.findById(1L)).willReturn(Optional.of(loginMember));
        given(memberHistoryRepository.findWeeklyRankingsByRegion(
                Region.JEJU,
                weekRange.startDate(),
                weekRange.endDate()
        )).willReturn(List.of(summary(1L, "로그인회원", 0)));

        // when
        RankingResponse response = rankingReadService.getRankings(1L);

        // then
        assertThat(response.myRank()).isEqualTo(1);
        assertThat(response.rankings()).hasSize(1);
        assertThat(response.rankings().getFirst().memberId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("로그인 회원의 지역이 없으면 지역 설정 필요 예외가 발생한다")
    void getRankingsRejectsMemberWithoutRegion() {
        // given
        Member loginMember = member(1L, "로그인회원", null);
        given(memberRepository.findById(1L)).willReturn(Optional.of(loginMember));

        // when & then
        assertThatThrownBy(() -> rankingReadService.getRankings(1L))
                .isInstanceOfSatisfying(CustomException.class, exception -> {
                    assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.MEMBER_REGION_NOT_SET);
                    assertThat(exception.getMessage()).isEqualTo("지역을 설정해야 랭킹을 확인할 수 있습니다.");
                });
    }

    @Test
    @DisplayName("로그인 회원이 존재하지 않으면 회원 없음 예외가 발생한다")
    void getRankingsRejectsMissingMember() {
        // given
        given(memberRepository.findById(1L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> rankingReadService.getRankings(1L))
                .isInstanceOfSatisfying(CustomException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.MEMBER_NOT_FOUND));
    }

    private Member member(Long id, String nickname, Region region) {
        Member member = Member.create(nickname + "@example.com", "password", nickname, region);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
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
