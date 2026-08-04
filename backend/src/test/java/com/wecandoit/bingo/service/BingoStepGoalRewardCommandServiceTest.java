package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.times;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.game.service.RoomReadService;
import com.wecandoit.game.service.StepGoalRewardMember;
import com.wecandoit.game.service.StepGoalRewardTarget;
import com.wecandoit.history.repository.WalkSessionRepository;
import com.wecandoit.point.service.PointCommandService;
import com.wecandoit.point.service.PointReadService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("빙고 공동 걸음 목표 보상 서비스")
@ExtendWith(MockitoExtension.class)
class BingoStepGoalRewardCommandServiceTest {

    @Mock
    private RoomReadService roomReadService;
    @Mock
    private WalkSessionRepository walkSessionRepository;
    @Mock
    private PointReadService pointReadService;
    @Mock
    private PointCommandService pointCommandService;
    @Mock
    private BingoBoardRepository bingoBoardRepository;
    @InjectMocks
    private BingoStepGoalRewardCommandService rewardCommandService;

    @Test
    @DisplayName("방 워크 세션 걸음 합계가 목표 이상이면 전원에게 보상한다")
    void evaluateGrantsRewardWhenRoomWalkSessionsReachGoal() {
        // given
        StepGoalRewardTarget target = target(
                10L,
                100L,
                1_000,
                List.of(member(1L), member(2L))
        );
        given(roomReadService.getStepGoalRewardTargets(1L)).willReturn(List.of(target));
        given(bingoBoardRepository.findByIdForUpdate(100L)).willReturn(Optional.of(board(100L)));
        given(pointReadService.hasDailyStepGoalReward(100L)).willReturn(false);
        given(walkSessionRepository.sumStepByRoomIdAndInitialBingoBoardIdAndMemberIds(
                10L,
                100L,
                List.of(1L, 2L)
        )).willReturn(1_000L);

        // when
        rewardCommandService.evaluate(1L, 10L);

        // then
        then(pointCommandService).should()
                .grantDailyStepGoalReward(10L, 100L, List.of(1L, 2L));
    }

    @Test
    @DisplayName("방 워크 세션 걸음 합계가 목표 미만이면 보상하지 않는다")
    void evaluateSkipsRewardBelowGoal() {
        // given
        StepGoalRewardTarget target = target(
                10L,
                100L,
                1_000,
                List.of(member(1L))
        );
        given(roomReadService.getStepGoalRewardTargets(1L)).willReturn(List.of(target));
        given(bingoBoardRepository.findByIdForUpdate(100L)).willReturn(Optional.of(board(100L)));
        given(pointReadService.hasDailyStepGoalReward(100L)).willReturn(false);
        given(walkSessionRepository.sumStepByRoomIdAndInitialBingoBoardIdAndMemberIds(
                10L,
                100L,
                List.of(1L)
        )).willReturn(999L);

        // when
        rewardCommandService.evaluate(1L, 10L);

        // then
        then(pointCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("같은 빙고판에서 이미 보상했다면 걸음 합계를 계산하지 않는다")
    void evaluateSkipsAlreadyRewardedBoard() {
        // given
        StepGoalRewardTarget target = target(
                10L,
                100L,
                1_000,
                List.of(member(1L))
        );
        given(roomReadService.getStepGoalRewardTargets(1L)).willReturn(List.of(target));
        given(bingoBoardRepository.findByIdForUpdate(100L)).willReturn(Optional.of(board(100L)));
        given(pointReadService.hasDailyStepGoalReward(100L)).willReturn(true);

        // when
        rewardCommandService.evaluate(1L, 10L);

        // then
        then(walkSessionRepository).shouldHaveNoInteractions();
        then(pointCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("요청된 방만 평가하고 빙고판 ID 순서로 잠근다")
    void evaluateFiltersRequestedRoomAndLocksBoardsInOrder() {
        // given
        StepGoalRewardTarget laterBoard = target(10L, 200L, 100, List.of(member(1L)));
        StepGoalRewardTarget earlierBoard = target(10L, 100L, 100, List.of(member(1L)));
        StepGoalRewardTarget otherRoom = target(20L, 50L, 100, List.of(member(1L)));
        given(roomReadService.getStepGoalRewardTargets(1L))
                .willReturn(List.of(laterBoard, otherRoom, earlierBoard));
        given(bingoBoardRepository.findByIdForUpdate(100L)).willReturn(Optional.of(board(100L)));
        given(bingoBoardRepository.findByIdForUpdate(200L)).willReturn(Optional.of(board(200L)));
        given(walkSessionRepository.sumStepByRoomIdAndInitialBingoBoardIdAndMemberIds(
                10L,
                100L,
                List.of(1L)
        )).willReturn(100L);
        given(walkSessionRepository.sumStepByRoomIdAndInitialBingoBoardIdAndMemberIds(
                10L,
                200L,
                List.of(1L)
        )).willReturn(100L);

        // when
        rewardCommandService.evaluate(1L, 10L);

        // then
        ArgumentCaptor<Long> boardIdCaptor = ArgumentCaptor.forClass(Long.class);
        then(bingoBoardRepository).should(times(2)).findByIdForUpdate(boardIdCaptor.capture());
        assertThat(boardIdCaptor.getAllValues()).containsExactly(100L, 200L);
        then(pointCommandService).should()
                .grantDailyStepGoalReward(10L, 100L, List.of(1L));
        then(pointCommandService).should()
                .grantDailyStepGoalReward(10L, 200L, List.of(1L));
    }

    private StepGoalRewardTarget target(
            Long roomId,
            Long bingoBoardId,
            int targetStepCount,
            List<StepGoalRewardMember> members
    ) {
        return new StepGoalRewardTarget(
                roomId,
                bingoBoardId,
                targetStepCount,
                members
        );
    }

    private StepGoalRewardMember member(Long memberId) {
        return new StepGoalRewardMember(memberId);
    }

    private BingoBoard board(Long bingoBoardId) {
        BingoBoard bingoBoard = BingoBoard.create(1L, 3);
        ReflectionTestUtils.setField(bingoBoard, "id", bingoBoardId);
        return bingoBoard;
    }
}
