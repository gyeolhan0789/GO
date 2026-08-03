package com.wecandoit.ranking.service;

import com.wecandoit.avatar.service.AvatarReadService;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.history.repository.MemberHistoryRepository;
import com.wecandoit.history.repository.RankedWeeklyRankingSummary;
import com.wecandoit.item.controller.response.CharacterResponse;
import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.domain.Region;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.ranking.controller.response.RankingResponse;
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
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("랭킹 조회 서비스")
@ExtendWith(MockitoExtension.class)
class RankingReadServiceTest {

    @Mock
    private MemberRepository memberRepository;
    @Mock
    private MemberHistoryRepository memberHistoryRepository;
    @Mock
    private AvatarReadService avatarReadService;
    @InjectMocks
    private RankingReadService rankingReadService;

    @Test
    @DisplayName("페이지와 무관한 전체 순위와 PageResponse 정보를 반환한다")
    void getRankingsReturnsGlobalRankAndPageResponse() {
        // given
        Member loginMember = member(4L, "로그인회원", Region.SEOUL);
        Member rankingMember = member(3L, "회원3", Region.SEOUL, Gender.FEMALE);
        PageRequest pageable = PageRequest.of(1, 2);
        given(memberRepository.findById(4L)).willReturn(Optional.of(loginMember));
        given(memberHistoryRepository.findPagedWeeklyRankingsByRegion(
                org.mockito.ArgumentMatchers.eq("SEOUL"),
                any(),
                any(),
                org.mockito.ArgumentMatchers.eq(pageable)
        )).willReturn(new PageImpl<>(
                List.of(
                        summary(3, 3L, "회원3", 15_000),
                        summary(4, 4L, "로그인회원", 12_500)
                ),
                pageable,
                5
        ));
        given(memberHistoryRepository.findWeeklyRankingByRegionAndMemberId(
                org.mockito.ArgumentMatchers.eq("SEOUL"),
                org.mockito.ArgumentMatchers.eq(4L),
                any(),
                any()
        )).willReturn(Optional.of(summary(4, 4L, "로그인회원", 12_500)));
        given(memberRepository.findAllById(List.of(3L))).willReturn(List.of(rankingMember));
        given(avatarReadService.getAvatars(List.of(rankingMember, loginMember)))
                .willReturn(Map.of(
                        3L,
                        new CharacterResponse(
                                3L,
                                "회원3",
                                Gender.FEMALE,
                                "/uploads/characters/female/default.png",
                                List.of(new EquippedItemResponse(
                                        10L,
                                        100L,
                                        "빨간 모자",
                                        ItemCategory.HAT,
                                        "https://example.com/hat.png"
                                ))
                        ),
                        4L,
                        new CharacterResponse(
                                4L,
                                "로그인회원",
                                Gender.MALE,
                                "/uploads/characters/male/default.png",
                                List.of()
                        )
                ));

        // when
        RankingResponse response = rankingReadService.getRankings(4L, pageable);

        // then
        assertThat(response.region()).isEqualTo(Region.SEOUL);
        assertThat(response.myRank()).isEqualTo(4);
        assertThat(response.myWeeklySteps()).isEqualTo(12_500);
        assertThat(response.rankings().content())
                .extracting("rank", "memberId")
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(3, 3L),
                        org.assertj.core.groups.Tuple.tuple(4, 4L)
                );
        assertThat(response.rankings().content().getFirst().equippedItems()).hasSize(1);
        assertThat(response.rankings().content().getFirst().gender()).isEqualTo(Gender.FEMALE);
        assertThat(response.rankings().content().getFirst().defaultImageUrl())
                .isEqualTo("/uploads/characters/female/default.png");
        assertThat(response.rankings().content().get(1).equippedItems()).isEmpty();
        assertThat(response.rankings().totalElements()).isEqualTo(5);
        assertThat(response.rankings().totalPages()).isEqualTo(3);
        assertThat(response.rankings().currentPage()).isEqualTo(1);
        assertThat(response.rankings().size()).isEqualTo(2);
        assertThat(response.rankings().hasNext()).isTrue();
        then(memberRepository).should().findAllById(List.of(3L));
        then(avatarReadService).should().getAvatars(List.of(rankingMember, loginMember));
    }

    @Test
    @DisplayName("로그인 회원이 현재 페이지에 없어도 전체 기준 내 순위를 반환한다")
    void getRankingsReturnsMyRankOutsideCurrentPage() {
        // given
        Member loginMember = member(5L, "로그인회원", Region.BUSAN);
        Member firstRankingMember = member(1L, "회원1", Region.BUSAN);
        Member secondRankingMember = member(2L, "회원2", Region.BUSAN, Gender.FEMALE);
        PageRequest pageable = PageRequest.of(0, 2);
        given(memberRepository.findById(5L)).willReturn(Optional.of(loginMember));
        given(memberHistoryRepository.findPagedWeeklyRankingsByRegion(
                org.mockito.ArgumentMatchers.eq("BUSAN"),
                any(),
                any(),
                org.mockito.ArgumentMatchers.eq(pageable)
        )).willReturn(new PageImpl<>(
                List.of(
                        summary(1, 1L, "회원1", 20_000),
                        summary(1, 2L, "회원2", 20_000)
                ),
                pageable,
                5
        ));
        given(memberHistoryRepository.findWeeklyRankingByRegionAndMemberId(
                org.mockito.ArgumentMatchers.eq("BUSAN"),
                org.mockito.ArgumentMatchers.eq(5L),
                any(),
                any()
        )).willReturn(Optional.of(summary(5, 5L, "로그인회원", 0)));
        given(memberRepository.findAllById(List.of(1L, 2L)))
                .willReturn(List.of(firstRankingMember, secondRankingMember));
        given(avatarReadService.getAvatars(List.of(firstRankingMember, secondRankingMember)))
                .willReturn(Map.of(
                        1L,
                        new CharacterResponse(
                                1L,
                                "회원1",
                                Gender.MALE,
                                "/uploads/characters/male/default.png",
                                List.of()
                        ),
                        2L,
                        new CharacterResponse(
                                2L,
                                "회원2",
                                Gender.FEMALE,
                                "/uploads/characters/female/default.png",
                                List.of()
                        )
                ));

        // when
        RankingResponse response = rankingReadService.getRankings(5L, pageable);

        // then
        assertThat(response.myRank()).isEqualTo(5);
        assertThat(response.myWeeklySteps()).isZero();
        assertThat(response.rankings().content())
                .extracting("rank")
                .containsExactly(1, 1);
    }

    @Test
    @DisplayName("지역을 설정하지 않은 회원은 지역 설정 필요 예외가 발생한다")
    void getRankingsRejectsMemberWithoutRegion() {
        // given
        given(memberRepository.findById(1L))
                .willReturn(Optional.of(member(1L, "로그인회원", null)));

        // when & then
        assertThatThrownBy(() -> rankingReadService.getRankings(1L, PageRequest.of(0, 20)))
                .isInstanceOfSatisfying(CustomException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(ErrorCode.MEMBER_REGION_NOT_SET));
    }

    @Test
    @DisplayName("존재하지 않는 회원은 회원 없음 예외가 발생한다")
    void getRankingsRejectsMissingMember() {
        // given
        given(memberRepository.findById(1L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> rankingReadService.getRankings(1L, PageRequest.of(0, 20)))
                .isInstanceOfSatisfying(CustomException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.MEMBER_NOT_FOUND));
    }

    private Member member(Long id, String nickname, Region region) {
        return member(id, nickname, region, Gender.MALE);
    }

    private Member member(Long id, String nickname, Region region, Gender gender) {
        Member member = Member.create(nickname + "@example.com", "password", nickname, region, gender);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
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
