package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.times;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.point.service.PointCommandService;
import com.wecandoit.point.service.PointReadService;
import com.wecandoit.game.service.RoomReadService;
import com.wecandoit.game.service.StepGoalRewardMember;
import com.wecandoit.game.service.StepGoalRewardTarget;
import com.wecandoit.history.service.HistoryReadService;
import com.wecandoit.history.service.StepRecord;
import java.time.LocalDate;
import java.time.ZoneId;
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

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    @Mock
    private RoomReadService roomReadService;
    @Mock
    private HistoryReadService historyReadService;
    @Mock
    private PointReadService pointReadService;
    @Mock
    private PointCommandService pointCommandService;
    @Mock
    private BingoBoardRepository bingoBoardRepository;
    @InjectMocks
    private BingoStepGoalRewardCommandService rewardCommandService;

    @Test
    @DisplayName("현재 멤버의 유효 걸음 합계가 목표 이상이면 전원에게 보상한다")
    void evaluateGrantsRewardWhenCurrentMembersReachGoal() {
        // given
        LocalDate today = LocalDate.now(SERVICE_ZONE_ID);
        LocalDate boardStartedDate = today.minusDays(6);
        StepGoalRewardTarget target = target(
                10L,
                100L,
                boardStartedDate,
                1_000,
                List.of(
                        new StepGoalRewardMember(1L, boardStartedDate.minusDays(1)),
                        new StepGoalRewardMember(2L, boardStartedDate.plusDays(2))
                )
        );
        given(roomReadService.getStepGoalRewardTargets(1L)).willReturn(List.of(target));
        given(bingoBoardRepository.findByIdForUpdate(100L)).willReturn(Optional.of(board(100L)));
        given(pointReadService.hasDailyStepGoalReward(100L)).willReturn(false);
        given(historyReadService.getStepRecords(
                List.of(1L, 2L),
                boardStartedDate,
                today
        )).willReturn(List.of(
                new StepRecord(1L, boardStartedDate.minusDays(1), 500),
                new StepRecord(1L, boardStartedDate, 600),
                new StepRecord(2L, boardStartedDate.plusDays(1), 500),
                new StepRecord(2L, boardStartedDate.plusDays(2), 400)
        ));

        // when
        rewardCommandService.evaluate(1L);

        // then
        then(pointCommandService).should()
                .grantDailyStepGoalReward(10L, 100L, List.of(1L, 2L));
    }

    @Test
    @DisplayName("공동 걸음 합계가 목표 미만이면 보상하지 않는다")
    void evaluateSkipsRewardBelowGoal() {
        // given
        LocalDate today = LocalDate.now(SERVICE_ZONE_ID);
        LocalDate boardStartedDate = today.minusDays(6);
        StepGoalRewardTarget target = target(
                10L,
                100L,
                boardStartedDate,
                1_000,
                List.of(new StepGoalRewardMember(1L, boardStartedDate))
        );
        given(roomReadService.getStepGoalRewardTargets(1L)).willReturn(List.of(target));
        given(bingoBoardRepository.findByIdForUpdate(100L)).willReturn(Optional.of(board(100L)));
        given(pointReadService.hasDailyStepGoalReward(100L)).willReturn(false);
        given(historyReadService.getStepRecords(
                List.of(1L),
                boardStartedDate,
                today
        )).willReturn(List.of(new StepRecord(1L, today, 999)));

        // when
        rewardCommandService.evaluate(1L);

        // then
        then(pointCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("같은 빙고판에서 이미 보상했다면 걸음 합계와 보상을 다시 처리하지 않는다")
    void evaluateSkipsAlreadyRewardedBoard() {
        // given
        LocalDate boardStartedDate = LocalDate.now(SERVICE_ZONE_ID).minusDays(6);
        StepGoalRewardTarget target = target(
                10L,
                100L,
                boardStartedDate,
                1_000,
                List.of(new StepGoalRewardMember(1L, boardStartedDate))
        );
        given(roomReadService.getStepGoalRewardTargets(1L)).willReturn(List.of(target));
        given(bingoBoardRepository.findByIdForUpdate(100L)).willReturn(Optional.of(board(100L)));
        given(pointReadService.hasDailyStepGoalReward(100L)).willReturn(true);

        // when
        rewardCommandService.evaluate(1L);

        // then
        then(historyReadService).shouldHaveNoInteractions();
        then(pointCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("여러 방은 빙고판 ID 순서로 잠그고 방별로 보상한다")
    void evaluateLocksBoardsInOrderAndRewardsEachRoom() {
        // given
        LocalDate today = LocalDate.now(SERVICE_ZONE_ID);
        LocalDate boardStartedDate = today.minusDays(6);
        StepGoalRewardTarget laterBoard = target(
                20L,
                200L,
                boardStartedDate,
                100,
                List.of(new StepGoalRewardMember(1L, boardStartedDate))
        );
        StepGoalRewardTarget earlierBoard = target(
                10L,
                100L,
                boardStartedDate,
                100,
                List.of(new StepGoalRewardMember(1L, boardStartedDate))
        );
        given(roomReadService.getStepGoalRewardTargets(1L))
                .willReturn(List.of(laterBoard, earlierBoard));
        given(bingoBoardRepository.findByIdForUpdate(100L)).willReturn(Optional.of(board(100L)));
        given(bingoBoardRepository.findByIdForUpdate(200L)).willReturn(Optional.of(board(200L)));
        given(historyReadService.getStepRecords(
                List.of(1L),
                boardStartedDate,
                today
        )).willReturn(List.of(new StepRecord(1L, today, 100)));

        // when
        rewardCommandService.evaluate(1L);

        // then
        ArgumentCaptor<Long> boardIdCaptor = ArgumentCaptor.forClass(Long.class);
        then(bingoBoardRepository).should(times(2)).findByIdForUpdate(boardIdCaptor.capture());
        assertThat(boardIdCaptor.getAllValues()).containsExactly(100L, 200L);
        then(pointCommandService).should()
                .grantDailyStepGoalReward(10L, 100L, List.of(1L));
        then(pointCommandService).should()
                .grantDailyStepGoalReward(20L, 200L, List.of(1L));
    }

    private StepGoalRewardTarget target(
            Long roomId,
            Long bingoBoardId,
            LocalDate boardStartedDate,
            int targetStepCount,
            List<StepGoalRewardMember> members
    ) {
        return new StepGoalRewardTarget(
                roomId,
                bingoBoardId,
                boardStartedDate,
                targetStepCount,
                members
        );
    }

    private BingoBoard board(Long bingoBoardId) {
        BingoBoard bingoBoard = BingoBoard.create(1L, 3);
        ReflectionTestUtils.setField(bingoBoard, "id", bingoBoardId);
        return bingoBoard;
    }
}
