package com.wecandoit.cash.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.never;

import com.wecandoit.cash.domain.CashHistory;
import com.wecandoit.cash.domain.CashHistoryType;
import com.wecandoit.cash.repository.CashHistoryRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.mission.domain.MissionType;
import com.wecandoit.notification.event.NotificationMessageFactory;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

@DisplayName("캐시 변경 서비스")
@ExtendWith(MockitoExtension.class)
class CashCommandServiceTest {

    @Mock
    private MemberRepository memberRepository;
    @Mock
    private CashHistoryRepository cashHistoryRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private NotificationMessageFactory notificationMessageFactory;
    @InjectMocks
    private CashCommandService cashCommandService;

    @Test
    @DisplayName("빙고 칸 보상을 지급하면 회원 캐시가 증가하고 이력이 저장된다")
    void grantBingoCellRewardIncreasesCashAndSavesHistory() {
        // given
        Member member = member(0L);
        given(cashHistoryRepository.existsByMemberIdAndTypeAndReferenceId(
                1L,
                CashHistoryType.BINGO_CELL_REWARD,
                1000L
        )).willReturn(false);
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(member));

        // when
        long rewardCash = cashCommandService.grantBingoCellReward(1L, 10L, 1000L, MissionType.RELATION);

        // then
        assertThat(rewardCash).isEqualTo(70L);
        assertThat(member.getCash()).isEqualTo(70L);
        ArgumentCaptor<CashHistory> captor = ArgumentCaptor.forClass(CashHistory.class);
        then(cashHistoryRepository).should().save(captor.capture());
        CashHistory history = captor.getValue();
        assertThat(history.getMemberId()).isEqualTo(1L);
        assertThat(history.getType()).isEqualTo(CashHistoryType.BINGO_CELL_REWARD);
        assertThat(history.getAmount()).isEqualTo(70L);
        assertThat(history.getReferenceId()).isEqualTo(1000L);
        assertThat(history.getRoomId()).isEqualTo(10L);
    }

    @Test
    @DisplayName("이미 빙고 칸 보상 이력이 있으면 중복 지급하지 않는다")
    void grantBingoCellRewardSkipsDuplicateHistory() {
        // given
        Member member = member(0L);
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(member));
        given(cashHistoryRepository.existsByMemberIdAndTypeAndReferenceId(
                1L,
                CashHistoryType.BINGO_CELL_REWARD,
                1000L
        )).willReturn(true);

        // when
        long rewardCash = cashCommandService.grantBingoCellReward(1L, 10L, 1000L, MissionType.OBJECT);

        // then
        assertThat(rewardCash).isZero();
        assertThat(member.getCash()).isZero();
        then(cashHistoryRepository).should(never()).save(any());
        then(eventPublisher).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("회원이 없으면 빙고 칸 보상 지급에 실패한다")
    void grantBingoCellRewardRejectsMissingMember() {
        // given
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> cashCommandService.grantBingoCellReward(1L, 10L, 1000L, MissionType.ORDINARY))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
        then(cashHistoryRepository).should(never())
                .existsByMemberIdAndTypeAndReferenceId(1L, CashHistoryType.BINGO_CELL_REWARD, 1000L);
        then(cashHistoryRepository).should(never()).save(any());
    }

    private Member member(long cash) {
        return Member.builder()
                .email("reward@example.com")
                .nickname("reward-member")
                .cash(cash)
                .build();
    }
}
