package com.wecandoit.history.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.history.domain.MemberHistory;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.domain.Region;
import com.wecandoit.member.repository.MemberRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("주간 지역 랭킹 저장소")
class WeeklyRankingRepositoryTest {

    private static final LocalDate START_DATE = LocalDate.of(2026, 7, 20);
    private static final LocalDate END_DATE = LocalDate.of(2026, 7, 23);

    @Autowired
    private MemberRepository memberRepository;
    @Autowired
    private MemberHistoryRepository memberHistoryRepository;

    @Test
    @DisplayName("같은 지역 회원의 기간 내 걸음 수를 합산한다")
    void findWeeklyRankingsByRegionSumsStepsInRange() {
        // given
        Member member = saveMember("서울회원", Region.SEOUL);
        saveHistory(member, LocalDate.of(2026, 7, 20), 1_000);
        saveHistory(member, LocalDate.of(2026, 7, 22), 2_000);

        // when
        List<WeeklyRankingSummary> rankings = memberHistoryRepository.findWeeklyRankingsByRegion(
                Region.SEOUL,
                START_DATE,
                END_DATE
        );

        // then
        assertThat(rankings).hasSize(1);
        assertThat(rankings.getFirst().getMemberId()).isEqualTo(member.getId());
        assertThat(rankings.getFirst().getWeeklySteps()).isEqualTo(3_000);
    }

    @Test
    @DisplayName("기간 밖 걸음 기록은 주간 걸음 수에서 제외한다")
    void findWeeklyRankingsByRegionExcludesStepsOutsideRange() {
        // given
        Member member = saveMember("서울회원", Region.SEOUL);
        saveHistory(member, LocalDate.of(2026, 7, 19), 10_000);
        saveHistory(member, LocalDate.of(2026, 7, 20), 1_000);
        saveHistory(member, LocalDate.of(2026, 7, 24), 20_000);

        // when
        List<WeeklyRankingSummary> rankings = memberHistoryRepository.findWeeklyRankingsByRegion(
                Region.SEOUL,
                START_DATE,
                END_DATE
        );

        // then
        assertThat(rankings.getFirst().getWeeklySteps()).isEqualTo(1_000);
    }

    @Test
    @DisplayName("다른 지역 회원은 랭킹에서 제외한다")
    void findWeeklyRankingsByRegionExcludesOtherRegions() {
        // given
        Member seoulMember = saveMember("서울회원", Region.SEOUL);
        Member busanMember = saveMember("부산회원", Region.BUSAN);
        saveHistory(seoulMember, START_DATE, 1_000);
        saveHistory(busanMember, START_DATE, 10_000);

        // when
        List<WeeklyRankingSummary> rankings = memberHistoryRepository.findWeeklyRankingsByRegion(
                Region.SEOUL,
                START_DATE,
                END_DATE
        );

        // then
        assertThat(rankings)
                .extracting(WeeklyRankingSummary::getMemberId)
                .containsExactly(seoulMember.getId());
    }

    @Test
    @DisplayName("걸음 기록이 없는 같은 지역 회원도 0걸음으로 포함한다")
    void findWeeklyRankingsByRegionIncludesMemberWithoutHistory() {
        // given
        Member member = saveMember("서울회원", Region.SEOUL);

        // when
        List<WeeklyRankingSummary> rankings = memberHistoryRepository.findWeeklyRankingsByRegion(
                Region.SEOUL,
                START_DATE,
                END_DATE
        );

        // then
        assertThat(rankings).hasSize(1);
        assertThat(rankings.getFirst().getMemberId()).isEqualTo(member.getId());
        assertThat(rankings.getFirst().getWeeklySteps()).isZero();
    }

    @Test
    @DisplayName("걸음 수 내림차순과 동점 회원 ID 오름차순으로 정렬한다")
    void findWeeklyRankingsByRegionOrdersByStepsAndMemberId() {
        // given
        Member firstMember = saveMember("첫회원", Region.SEOUL);
        Member secondMember = saveMember("둘회원", Region.SEOUL);
        Member thirdMember = saveMember("셋회원", Region.SEOUL);
        saveHistory(firstMember, START_DATE, 1_000);
        saveHistory(secondMember, START_DATE, 2_000);
        saveHistory(thirdMember, START_DATE, 2_000);

        // when
        List<WeeklyRankingSummary> rankings = memberHistoryRepository.findWeeklyRankingsByRegion(
                Region.SEOUL,
                START_DATE,
                END_DATE
        );

        // then
        assertThat(rankings)
                .extracting(WeeklyRankingSummary::getMemberId)
                .containsExactly(secondMember.getId(), thirdMember.getId(), firstMember.getId());
    }

    private Member saveMember(String nickname, Region region) {
        return memberRepository.saveAndFlush(
                Member.create(nickname + "@example.com", "password", nickname, region)
        );
    }

    private void saveHistory(Member member, LocalDate date, int step) {
        memberHistoryRepository.saveAndFlush(MemberHistory.create(member.getId(), date, step, 0, 0));
    }
}
