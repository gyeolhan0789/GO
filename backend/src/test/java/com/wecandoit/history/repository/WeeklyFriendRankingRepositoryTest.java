package com.wecandoit.history.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.friend.domain.Friend;
import com.wecandoit.friend.domain.FriendRequest;
import com.wecandoit.friend.repository.FriendRepository;
import com.wecandoit.friend.repository.FriendRequestRepository;
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
@DisplayName("주간 친구 랭킹 저장소")
class WeeklyFriendRankingRepositoryTest {

    private static final LocalDate START_DATE = LocalDate.of(2026, 7, 20);
    private static final LocalDate END_DATE = LocalDate.of(2026, 7, 23);

    @Autowired
    private MemberRepository memberRepository;
    @Autowired
    private MemberHistoryRepository memberHistoryRepository;
    @Autowired
    private FriendRepository friendRepository;
    @Autowired
    private FriendRequestRepository friendRequestRepository;

    @Test
    @DisplayName("친구가 없으면 로그인 회원만 0걸음으로 조회한다")
    void findWeeklyFriendRankingsReturnsOnlyLoginMemberWithoutFriends() {
        // given
        Member loginMember = saveMember("로그인회원", Region.SEOUL);

        // when
        List<WeeklyRankingSummary> rankings = findRankings(loginMember);

        // then
        assertThat(rankings).hasSize(1);
        assertThat(rankings.getFirst().getMemberId()).isEqualTo(loginMember.getId());
        assertThat(rankings.getFirst().getWeeklySteps()).isZero();
    }

    @Test
    @DisplayName("로그인 회원이 member1과 member2 어느 쪽이든 친구를 조회한다")
    void findWeeklyFriendRankingsFindsFriendsFromBothDirections() {
        // given
        Member smallerIdFriend = saveMember("작은친구", Region.BUSAN);
        Member loginMember = saveMember("로그인회원", Region.SEOUL);
        Member largerIdFriend = saveMember("큰친구", Region.JEJU);
        friendRepository.saveAll(List.of(
                Friend.create(loginMember, smallerIdFriend),
                Friend.create(loginMember, largerIdFriend)
        ));

        // when
        List<WeeklyRankingSummary> rankings = findRankings(loginMember);

        // then
        assertThat(rankings)
                .extracting(WeeklyRankingSummary::getMemberId)
                .containsExactly(smallerIdFriend.getId(), loginMember.getId(), largerIdFriend.getId());
    }

    @Test
    @DisplayName("친구가 아닌 회원과 대기 중인 친구 요청 상대는 제외한다")
    void findWeeklyFriendRankingsExcludesNonFriendsAndPendingRequests() {
        // given
        Member loginMember = saveMember("로그인회원", Region.SEOUL);
        Member friend = saveMember("친구", Region.BUSAN);
        Member nonFriend = saveMember("비친구", Region.SEOUL);
        Member pendingMember = saveMember("대기회원", Region.SEOUL);
        friendRepository.save(Friend.create(loginMember, friend));
        friendRequestRepository.save(FriendRequest.create(loginMember, pendingMember));

        // when
        List<WeeklyRankingSummary> rankings = findRankings(loginMember);

        // then
        assertThat(rankings)
                .extracting(WeeklyRankingSummary::getMemberId)
                .containsExactly(loginMember.getId(), friend.getId())
                .doesNotContain(nonFriend.getId(), pendingMember.getId());
    }

    @Test
    @DisplayName("기간 내 걸음 수만 합산하고 기록이 없는 친구도 포함한다")
    void findWeeklyFriendRankingsSumsInRangeAndIncludesZeroSteps() {
        // given
        Member loginMember = saveMember("로그인회원", Region.SEOUL);
        Member walkingFriend = saveMember("걷는친구", Region.BUSAN);
        Member zeroStepFriend = saveMember("영걸음친구", Region.JEJU);
        friendRepository.saveAll(List.of(
                Friend.create(loginMember, walkingFriend),
                Friend.create(loginMember, zeroStepFriend)
        ));
        saveHistory(walkingFriend, LocalDate.of(2026, 7, 19), 10_000);
        saveHistory(walkingFriend, LocalDate.of(2026, 7, 20), 1_000);
        saveHistory(walkingFriend, LocalDate.of(2026, 7, 22), 2_000);
        saveHistory(walkingFriend, LocalDate.of(2026, 7, 24), 20_000);

        // when
        List<WeeklyRankingSummary> rankings = findRankings(loginMember);

        // then
        assertThat(rankings.getFirst().getMemberId()).isEqualTo(walkingFriend.getId());
        assertThat(rankings.getFirst().getWeeklySteps()).isEqualTo(3_000);
        assertThat(rankings)
                .filteredOn(ranking -> ranking.getMemberId().equals(zeroStepFriend.getId()))
                .singleElement()
                .extracting(WeeklyRankingSummary::getWeeklySteps)
                .isEqualTo(0L);
    }

    @Test
    @DisplayName("걸음 수 내림차순과 동점 회원 ID 오름차순으로 중복 없이 조회한다")
    void findWeeklyFriendRankingsOrdersDeterministicallyWithoutDuplicates() {
        // given
        Member loginMember = saveMember("로그인회원", Region.SEOUL);
        Member firstFriend = saveMember("첫친구", Region.BUSAN);
        Member secondFriend = saveMember("둘친구", Region.JEJU);
        friendRepository.saveAll(List.of(
                Friend.create(loginMember, firstFriend),
                Friend.create(loginMember, secondFriend)
        ));
        saveHistory(loginMember, START_DATE, 1_000);
        saveHistory(firstFriend, START_DATE, 2_000);
        saveHistory(secondFriend, START_DATE, 2_000);

        // when
        List<WeeklyRankingSummary> rankings = findRankings(loginMember);

        // then
        assertThat(rankings)
                .extracting(WeeklyRankingSummary::getMemberId)
                .containsExactly(firstFriend.getId(), secondFriend.getId(), loginMember.getId())
                .doesNotHaveDuplicates();
    }

    private List<WeeklyRankingSummary> findRankings(Member loginMember) {
        return memberHistoryRepository.findWeeklyFriendRankings(
                loginMember.getId(),
                START_DATE,
                END_DATE
        );
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
