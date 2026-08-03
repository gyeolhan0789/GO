package com.wecandoit.point.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.point.controller.response.PointResponse;
import com.wecandoit.point.domain.PointHistoryType;
import com.wecandoit.point.repository.PointHistoryRepository;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("포인트 조회 서비스")
class PointReadServiceTest {

    @Mock
    private MemberRepository memberRepository;
    @Mock
    private PointHistoryRepository pointHistoryRepository;

    @InjectMocks
    private PointReadService pointReadService;

    @Test
    @DisplayName("회원의 보유 포인트를 반환한다")
    void returnsMembersPoint() {
        // given
        Member member = Member.builder()
                .email("point@example.com")
                .nickname("point-member")
                .point(0L)
                .build();
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));

        // when
        PointResponse response = pointReadService.getPoint(1L);

        // then
        assertThat(response.point()).isZero();
        then(memberRepository).should().findById(1L);
    }

    @Test
    @DisplayName("빙고판의 공동 걸음 목표 보상 이력 존재 여부를 반환한다")
    void returnsWhetherDailyStepGoalRewardExists() {
        // given
        given(pointHistoryRepository.existsByTypeAndReferenceId(
                PointHistoryType.DAILY_STEP_GOAL_REWARD,
                100L
        )).willReturn(true);

        // when
        boolean exists = pointReadService.hasDailyStepGoalReward(100L);

        // then
        assertThat(exists).isTrue();
    }
}
