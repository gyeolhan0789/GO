package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
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

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("빙고 셀 제출 동시성")
class BingoCommandServiceConcurrencyTest {

    @Autowired
    private BingoCommandService bingoCommandService;
    @Autowired
    private RoomRepository roomRepository;
    @Autowired
    private RoomMemberRepository roomMemberRepository;
    @Autowired
    private GameRepository gameRepository;
    @Autowired
    private BingoBoardRepository bingoBoardRepository;
    @Autowired
    private BingoCellRepository bingoCellRepository;

    private Long roomId;
    private Long cellId;

    @BeforeEach
    void setUp() {
        bingoCellRepository.deleteAll();
        bingoBoardRepository.deleteAll();
        gameRepository.deleteAll();
        roomMemberRepository.deleteAll();
        roomRepository.deleteAll();

        Room room = Room.create(1L, GameMode.COOPERATE, null, 3);
        room.start();
        roomId = roomRepository.save(room).getId();
        roomMemberRepository.save(RoomMember.create(roomId, 1L));
        roomMemberRepository.save(RoomMember.create(roomId, 2L));

        Game game = gameRepository.save(Game.start(roomId));
        BingoBoard board = bingoBoardRepository.save(BingoBoard.create(game.getId(), 3));
        cellId = bingoCellRepository.save(BingoCell.create(board.getId(), 1L, 0, 0)).getId();
    }

    @Test
    @DisplayName("같은 셀에 동시에 제출하면 한 요청만 검증 상태를 선점한다")
    void submitSameCellConcurrentlyAllowsOnlyOneRequest() throws Exception {
        // given
        CountDownLatch readyLatch = new CountDownLatch(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<ErrorCode> first = executor.submit(
                    () -> submitAfterSignal(1L, "https://example.com/first.png", readyLatch, startLatch));
            Future<ErrorCode> second = executor.submit(
                    () -> submitAfterSignal(2L, "https://example.com/second.png", readyLatch, startLatch));
            readyLatch.await();

            // when
            startLatch.countDown();
            List<ErrorCode> results = Arrays.asList(first.get(), second.get());

            // then
            assertThat(results.stream().filter(Objects::isNull).count()).isEqualTo(1);
            assertThat(results.stream()
                    .filter(ErrorCode.BINGO_CELL_VERIFICATION_IN_PROGRESS::equals)
                    .count()).isEqualTo(1);

            BingoCell claimedCell = bingoCellRepository.findById(cellId).orElseThrow();
            assertThat(claimedCell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.PENDING);
            assertThat(claimedCell.getMemberId()).isIn(1L, 2L);
            assertThat(claimedCell.getSubmitUrl())
                    .isIn("https://example.com/first.png", "https://example.com/second.png");
        } finally {
            executor.shutdownNow();
        }
    }

    private ErrorCode submitAfterSignal(
            Long memberId,
            String submitUrl,
            CountDownLatch readyLatch,
            CountDownLatch startLatch
    ) throws InterruptedException {
        readyLatch.countDown();
        startLatch.await();
        try {
            bingoCommandService.submitCell(memberId, roomId, cellId, submitUrl);
            return null;
        } catch (CustomException e) {
            return e.getErrorCode();
        }
    }
}
