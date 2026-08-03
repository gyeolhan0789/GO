package com.wecandoit.point.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;

import com.wecandoit.point.domain.PointHistory;
import com.wecandoit.point.domain.PointHistoryType;
import com.wecandoit.point.repository.PointHistoryRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.mission.domain.MissionDifficulty;
import com.wecandoit.notification.domain.NotificationType;
import com.wecandoit.notification.event.NotificationMessageFactory;
import com.wecandoit.notification.event.NotificationRequestedEvent;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

@DisplayName("포인트 변경 서비스")
@ExtendWith(MockitoExtension.class)
class PointCommandServiceTest {

    @Mock
    private MemberRepository memberRepository;
    @Mock
    private PointHistoryRepository pointHistoryRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private NotificationMessageFactory notificationMessageFactory;
    @InjectMocks
    private PointCommandService pointCommandService;

    @Test
    @DisplayName("빙고 칸 보상을 지급하면 회원 포인트가 증가하고 이력이 저장된다")
    void grantBingoCellRewardIncreasesPointAndSavesHistory() {
        // given
        Member member = member(0L);
        given(pointHistoryRepository.existsByMemberIdAndTypeAndReferenceId(
                1L,
                PointHistoryType.BINGO_CELL_REWARD,
                1000L
        )).willReturn(false);
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(member));

        // when
        long rewardPoint = pointCommandService.grantBingoCellReward(1L, 10L, 1000L, MissionDifficulty.HIGH);

        // then
        assertThat(rewardPoint).isEqualTo(70L);
        assertThat(member.getPoint()).isEqualTo(70L);
        ArgumentCaptor<PointHistory> captor = ArgumentCaptor.forClass(PointHistory.class);
        then(pointHistoryRepository).should().save(captor.capture());
        PointHistory history = captor.getValue();
        assertThat(history.getMemberId()).isEqualTo(1L);
        assertThat(history.getType()).isEqualTo(PointHistoryType.BINGO_CELL_REWARD);
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
        given(pointHistoryRepository.existsByMemberIdAndTypeAndReferenceId(
                1L,
                PointHistoryType.BINGO_CELL_REWARD,
                1000L
        )).willReturn(true);

        // when
        long rewardPoint = pointCommandService.grantBingoCellReward(1L, 10L, 1000L, MissionDifficulty.LOW);

        // then
        assertThat(rewardPoint).isZero();
        assertThat(member.getPoint()).isZero();
        then(pointHistoryRepository).should(never()).save(any());
        then(eventPublisher).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("회원이 없으면 빙고 칸 보상 지급에 실패한다")
    void grantBingoCellRewardRejectsMissingMember() {
        // given
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> pointCommandService.grantBingoCellReward(1L, 10L, 1000L, MissionDifficulty.LOW))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
        then(pointHistoryRepository).should(never())
                .existsByMemberIdAndTypeAndReferenceId(1L, PointHistoryType.BINGO_CELL_REWARD, 1000L);
        then(pointHistoryRepository).should(never()).save(any());
    }

    @Test
    @DisplayName("공동 걸음 목표 보상을 현재 방 멤버 전원에게 지급한다")
    void grantDailyStepGoalRewardRewardsAllRoomMembers() {
        // given
        Member firstMember = member(0L);
        Member secondMember = member(50L);
        NotificationRequestedEvent firstEvent = new NotificationRequestedEvent(
                1L,
                NotificationType.REWARD_EARNED,
                "title",
                "message"
        );
        NotificationRequestedEvent secondEvent = new NotificationRequestedEvent(
                2L,
                NotificationType.REWARD_EARNED,
                "title",
                "message"
        );
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(firstMember));
        given(memberRepository.findByIdForUpdate(2L)).willReturn(Optional.of(secondMember));
        given(notificationMessageFactory.rewardEarned(1L, 100L)).willReturn(firstEvent);
        given(notificationMessageFactory.rewardEarned(2L, 100L)).willReturn(secondEvent);

        // when
        pointCommandService.grantDailyStepGoalReward(10L, 1000L, List.of(2L, 1L));

        // then
        assertThat(firstMember.getPoint()).isEqualTo(100L);
        assertThat(secondMember.getPoint()).isEqualTo(150L);
        ArgumentCaptor<Long> memberIdCaptor = ArgumentCaptor.forClass(Long.class);
        then(memberRepository).should(times(2))
                .findByIdForUpdate(memberIdCaptor.capture());
        assertThat(memberIdCaptor.getAllValues()).containsExactly(1L, 2L);

        ArgumentCaptor<PointHistory> historyCaptor = ArgumentCaptor.forClass(PointHistory.class);
        then(pointHistoryRepository).should(times(2)).save(historyCaptor.capture());
        assertThat(historyCaptor.getAllValues())
                .extracting(
                        PointHistory::getMemberId,
                        PointHistory::getType,
                        PointHistory::getAmount,
                        PointHistory::getReferenceId,
                        PointHistory::getRoomId
                )
                .containsExactly(
                        tuple(
                                1L,
                                PointHistoryType.DAILY_STEP_GOAL_REWARD,
                                100L,
                                1000L,
                                10L
                        ),
                        tuple(
                                2L,
                                PointHistoryType.DAILY_STEP_GOAL_REWARD,
                                100L,
                                1000L,
                                10L
                        )
                );
        then(eventPublisher).should().publishEvent(firstEvent);
        then(eventPublisher).should().publishEvent(secondEvent);
    }

    private Member member(long point) {
        return Member.builder()
                .email("reward@example.com")
                .nickname("reward-member")
                .point(point)
                .build();
    }
}
