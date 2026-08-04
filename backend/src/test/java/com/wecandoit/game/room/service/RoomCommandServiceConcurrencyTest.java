package com.wecandoit.game.room.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.testcontainers.MySqlTestContainer;
import com.wecandoit.common.testcontainers.RedisTestContainer;
import com.wecandoit.game.controller.request.CreateRoomRequest;
import com.wecandoit.game.controller.response.CreateRoomResponse;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.RoomCommandService;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionType;
import com.wecandoit.mission.repository.MissionRepository;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.context.ImportTestcontainers;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@ImportTestcontainers({MySqlTestContainer.class, RedisTestContainer.class})
@DisplayName("SINGLE 게임방 생성 동시성")
class RoomCommandServiceConcurrencyTest {

    @Autowired
    private RoomCommandService roomCommandService;
    @Autowired
    private RoomRepository roomRepository;
    @Autowired
    private RoomMemberRepository roomMemberRepository;
    @Autowired
    private GameRepository gameRepository;
    @Autowired
    private GameParticipantRepository gameParticipantRepository;
    @Autowired
    private BingoBoardRepository bingoBoardRepository;
    @Autowired
    private BingoCellRepository bingoCellRepository;
    @Autowired
    private MemberRepository memberRepository;
    @Autowired
    private MissionRepository missionRepository;

    private Long memberId;

    @BeforeEach
    void setUp() {
        clearPersistedData();

        memberId = memberRepository.save(Member.create(
                "single@example.com",
                "encoded-password",
                "싱글 사용자",
                null,
                Gender.MALE
        )).getId();
        missionRepository.saveAll(IntStream.range(0, 9)
                .mapToObj(index -> Mission.create(
                        "https://example.com/mission-" + index + ".png",
                        MissionType.OBJECT,
                        "미션 " + index,
                        "설명",
                        null
                ))
                .toList());
    }

    @AfterEach
    void tearDown() {
        clearPersistedData();
    }

    private void clearPersistedData() {
        bingoCellRepository.deleteAll();
        bingoBoardRepository.deleteAll();
        gameParticipantRepository.deleteAll();
        gameRepository.deleteAll();
        roomMemberRepository.deleteAll();
        roomRepository.deleteAll();
        missionRepository.deleteAll();
        memberRepository.deleteAll();
    }

    @Test
    @DisplayName("동시에 생성해도 사용자에게 활성 SINGLE 방은 하나만 생긴다")
    void createSingleRoomConcurrentlyCreatesOneActiveRoom() throws Exception {
        CountDownLatch readyLatch = new CountDownLatch(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<Long> first = executor.submit(() -> createSingleRoomAfterSignal(readyLatch, startLatch));
            Future<Long> second = executor.submit(() -> createSingleRoomAfterSignal(readyLatch, startLatch));
            readyLatch.await();

            startLatch.countDown();
            List<Long> roomIds = List.of(first.get(), second.get());

            assertThat(roomIds).containsOnly(roomIds.getFirst());
            assertThat(roomRepository.findAllByModeAndStatus(GameMode.SINGLE, RoomStatus.ACTIVE))
                    .filteredOn(room -> room.isHost(memberId))
                    .hasSize(1);
            assertThat(gameRepository.count()).isEqualTo(1);
            assertThat(bingoBoardRepository.count()).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }

    private Long createSingleRoomAfterSignal(
            CountDownLatch readyLatch,
            CountDownLatch startLatch
    ) throws Exception {
        readyLatch.countDown();
        startLatch.await();
        CreateRoomResponse response = roomCommandService.createRoom(
                memberId,
                new CreateRoomRequest("싱글 방", GameMode.SINGLE, 1, 10_000, 3)
        );
        return response.roomId();
    }
}
