package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.cash.domain.CashHistoryType;
import com.wecandoit.cash.repository.CashHistoryRepository;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.history.controller.request.HistorySaveRequest;
import com.wecandoit.history.repository.MemberHistoryRepository;
import com.wecandoit.history.service.HistoryCommandService;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.notification.service.NotificationCommandService;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("빙고 공동 걸음 목표 보상 동시성")
class BingoStepGoalRewardConcurrencyTest {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    @Autowired
    private HistoryCommandService historyCommandService;
    @Autowired
    private MemberHistoryRepository memberHistoryRepository;
    @Autowired
    private CashHistoryRepository cashHistoryRepository;
    @Autowired
    private BingoBoardRepository bingoBoardRepository;
    @Autowired
    private GameRepository gameRepository;
    @Autowired
    private RoomMemberRepository roomMemberRepository;
    @Autowired
    private RoomRepository roomRepository;
    @Autowired
    private MemberRepository memberRepository;
    @MockitoBean
    private NotificationCommandService notificationCommandService;

    private Long firstMemberId;
    private Long secondMemberId;

    @BeforeEach
    void setUp() {
        cashHistoryRepository.deleteAll();
        memberHistoryRepository.deleteAll();
        bingoBoardRepository.deleteAll();
        gameRepository.deleteAll();
        roomMemberRepository.deleteAll();
        roomRepository.deleteAll();
        memberRepository.deleteAll();

        firstMemberId = memberRepository.save(Member.create(
                "step-first@example.com",
                "encoded-password",
                "step-first"
        )).getId();
        secondMemberId = memberRepository.save(Member.create(
                "step-second@example.com",
                "encoded-password",
                "step-second"
        )).getId();

        Room room = Room.create(firstMemberId, "테스트 방", GameMode.COOPERATE, null, 1_000, 3);
        room.start();
        Long roomId = roomRepository.saveAndFlush(room).getId();
        roomMemberRepository.saveAndFlush(RoomMember.create(roomId, firstMemberId));
        roomMemberRepository.saveAndFlush(RoomMember.create(roomId, secondMemberId));
        Game game = gameRepository.saveAndFlush(Game.start(roomId));
        bingoBoardRepository.saveAndFlush(BingoBoard.create(game.getId(), 3, 1_000));
    }

    @Test
    @DisplayName("서로 다른 멤버가 동시에 기록을 저장해 목표를 넘겨도 보상은 회원별 한 번만 지급된다")
    void rewardsEachMemberOnceWhenHistoriesAreSavedConcurrently() throws Exception {
        // given
        LocalDate historyDate = LocalDate.now(SERVICE_ZONE_ID);
        CountDownLatch readyLatch = new CountDownLatch(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<?> first = executor.submit(() ->
                    saveHistoryAfterSignal(firstMemberId, historyDate, readyLatch, startLatch));
            Future<?> second = executor.submit(() ->
                    saveHistoryAfterSignal(secondMemberId, historyDate, readyLatch, startLatch));
            readyLatch.await();

            // when
            startLatch.countDown();
            first.get();
            second.get();

            // then
            assertThat(memberHistoryRepository.count()).isEqualTo(2);
            assertThat(cashHistoryRepository.findAll())
                    .filteredOn(history -> history.getType() == CashHistoryType.DAILY_STEP_GOAL_REWARD)
                    .hasSize(2)
                    .extracting(history -> history.getMemberId())
                    .containsExactlyInAnyOrder(firstMemberId, secondMemberId);
            assertThat(memberRepository.findById(firstMemberId).orElseThrow().getCash()).isEqualTo(100L);
            assertThat(memberRepository.findById(secondMemberId).orElseThrow().getCash()).isEqualTo(100L);
        } finally {
            executor.shutdownNow();
        }
    }

    private void saveHistoryAfterSignal(
            Long memberId,
            LocalDate historyDate,
            CountDownLatch readyLatch,
            CountDownLatch startLatch
    ) {
        readyLatch.countDown();
        try {
            startLatch.await();
            historyCommandService.saveHistory(
                    memberId,
                    new HistorySaveRequest(historyDate, 600, 0, 0)
            );
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }
}
