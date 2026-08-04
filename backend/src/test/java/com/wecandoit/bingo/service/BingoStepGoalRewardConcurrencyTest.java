package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.common.testcontainers.MySqlTestContainer;
import com.wecandoit.common.testcontainers.RedisTestContainer;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.history.domain.WalkSession;
import com.wecandoit.history.repository.WalkSessionRepository;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.notification.service.NotificationCommandService;
import com.wecandoit.point.domain.PointHistoryType;
import com.wecandoit.point.repository.PointHistoryRepository;
import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.context.ImportTestcontainers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
@ActiveProfiles("test")
@ImportTestcontainers({MySqlTestContainer.class, RedisTestContainer.class})
@DisplayName("빙고 공동 걸음 목표 보상 동시성")
class BingoStepGoalRewardConcurrencyTest {

    @Autowired
    private BingoStepGoalRewardCommandService rewardCommandService;
    @Autowired
    private WalkSessionRepository walkSessionRepository;
    @Autowired
    private PointHistoryRepository pointHistoryRepository;
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
    private Long roomId;
    private Long bingoBoardId;

    @BeforeEach
    void setUp() {
        clearPersistedData();

        firstMemberId = memberRepository.save(Member.create(
                "step-first@example.com",
                "encoded-password",
                "step-first",
                null,
                Gender.MALE
        )).getId();
        secondMemberId = memberRepository.save(Member.create(
                "step-second@example.com",
                "encoded-password",
                "step-second",
                null,
                Gender.MALE
        )).getId();

        Room room = Room.create(firstMemberId, "걸음 테스트 방", GameMode.COOPERATE, null, 1_000, 3);
        roomId = roomRepository.saveAndFlush(room).getId();
        roomMemberRepository.saveAndFlush(RoomMember.create(roomId, firstMemberId));
        roomMemberRepository.saveAndFlush(RoomMember.create(roomId, secondMemberId));
        Game game = gameRepository.saveAndFlush(Game.start(roomId));
        bingoBoardId = bingoBoardRepository.saveAndFlush(BingoBoard.create(game.getId(), 3, 1_000)).getId();
    }

    @AfterEach
    void tearDown() {
        clearPersistedData();
    }

    private void clearPersistedData() {
        pointHistoryRepository.deleteAll();
        walkSessionRepository.deleteAll();
        bingoBoardRepository.deleteAll();
        gameRepository.deleteAll();
        roomMemberRepository.deleteAll();
        roomRepository.deleteAll();
        memberRepository.deleteAll();
    }

    @Test
    @DisplayName("방 워크 세션 평가가 동시에 실행되어도 보상은 회원별 한 번만 지급된다")
    void rewardsEachMemberOnceWhenRoomWalkSessionsAreEvaluatedConcurrently() throws Exception {
        // given
        walkSessionRepository.saveAndFlush(session(
                firstMemberId,
                "11111111-1111-1111-1111-111111111111",
                600
        ));
        walkSessionRepository.saveAndFlush(session(
                secondMemberId,
                "22222222-2222-2222-2222-222222222222",
                600
        ));
        CountDownLatch readyLatch = new CountDownLatch(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<?> first = executor.submit(() ->
                    evaluateRewardAfterSignal(firstMemberId, readyLatch, startLatch));
            Future<?> second = executor.submit(() ->
                    evaluateRewardAfterSignal(secondMemberId, readyLatch, startLatch));
            readyLatch.await();

            // when
            startLatch.countDown();
            first.get();
            second.get();

            // then
            assertThat(pointHistoryRepository.findAll())
                    .filteredOn(history -> history.getType() == PointHistoryType.DAILY_STEP_GOAL_REWARD)
                    .hasSize(2)
                    .extracting(history -> history.getMemberId())
                    .containsExactlyInAnyOrder(firstMemberId, secondMemberId);
            assertThat(memberRepository.findById(firstMemberId).orElseThrow().getPoint()).isEqualTo(100L);
            assertThat(memberRepository.findById(secondMemberId).orElseThrow().getPoint()).isEqualTo(100L);
        } finally {
            executor.shutdownNow();
        }
    }

    private void evaluateRewardAfterSignal(
            Long memberId,
            CountDownLatch readyLatch,
            CountDownLatch startLatch
    ) {
        readyLatch.countDown();
        try {
            startLatch.await();
            rewardCommandService.evaluate(memberId, roomId);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }

    private WalkSession session(Long memberId, String clientSessionKey, int step) {
        Instant endedAt = Instant.now();
        return WalkSession.create(
                memberId,
                roomId,
                clientSessionKey,
                bingoBoardId,
                endedAt.minusSeconds(600),
                endedAt,
                600L,
                step,
                0,
                0
        );
    }
}
