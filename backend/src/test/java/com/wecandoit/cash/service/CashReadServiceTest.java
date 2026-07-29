package com.wecandoit.cash.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.cash.controller.response.CashResponse;
import com.wecandoit.cash.domain.CashHistoryType;
import com.wecandoit.cash.repository.CashHistoryRepository;
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
@DisplayName("캐시 조회 서비스")
class CashReadServiceTest {

    @Mock
    private MemberRepository memberRepository;
    @Mock
    private CashHistoryRepository cashHistoryRepository;

    @InjectMocks
    private CashReadService cashReadService;

    @Test
    @DisplayName("회원의 보유 캐시를 반환한다")
    void returnsMembersCash() {
        // given
        Member member = Member.builder()
                .email("cash@example.com")
                .nickname("cash-member")
                .cash(0L)
                .build();
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));

        // when
        CashResponse response = cashReadService.getCash(1L);

        // then
        assertThat(response.cash()).isZero();
        then(memberRepository).should().findById(1L);
    }

    @Test
    @DisplayName("빙고판의 공동 걸음 목표 보상 이력 존재 여부를 반환한다")
    void returnsWhetherDailyStepGoalRewardExists() {
        // given
        given(cashHistoryRepository.existsByTypeAndReferenceId(
                CashHistoryType.DAILY_STEP_GOAL_REWARD,
                100L
        )).willReturn(true);

        // when
        boolean exists = cashReadService.hasDailyStepGoalReward(100L);

        // then
        assertThat(exists).isTrue();
    }
}
