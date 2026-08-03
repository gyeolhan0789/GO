package com.wecandoit.game.result.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.bingo.service.BingoCellVerificationResultService;
import com.wecandoit.point.repository.PointHistoryRepository;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameParticipant;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameResultParticipantRepository;
import com.wecandoit.game.repository.GameResultRepository;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.mission.domain.MissionDifficulty;
import com.wecandoit.notification.service.NotificationCommandService;
import java.util.List;
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
@DisplayName("협동 게임 완료 동시성")
class GameCompletionServiceConcurrencyTest {

    @Autowired
    private BingoCellVerificationResultService verificationResultService;
    @Autowired
    private RoomRepository roomRepository;
    @Autowired
    private RoomMemberRepository roomMemberRepository;
    @Autowired
    private BingoBoardRepository bingoBoardRepository;
    @Autowired
    private BingoCellRepository bingoCellRepository;
    @Autowired
    private GameResultRepository gameResultRepository;
    @Autowired
    private GameResultParticipantRepository gameResultParticipantRepository;
    @Autowired
    private GameRepository gameRepository;
    @Autowired
    private GameParticipantRepository gameParticipantRepository;
    @Autowired
    private MemberRepository memberRepository;
    @Autowired
    private PointHistoryRepository pointHistoryRepository;
    @MockitoBean
    private NotificationCommandService notificationCommandService;

    private Long roomId;
    private Long gameId;
    private Long boardId;
    private Long firstPendingCellId;
    private Long secondPendingCellId;
    private Long firstMemberId;
    private Long secondMemberId;

    @BeforeEach
    void setUp() {
        pointHistoryRepository.deleteAll();
        gameResultParticipantRepository.deleteAll();
        gameResultRepository.deleteAll();
        bingoCellRepository.deleteAll();
        bingoBoardRepository.deleteAll();
        gameParticipantRepository.deleteAll();
        gameRepository.deleteAll();
        roomMemberRepository.deleteAll();
        roomRepository.deleteAll();
        memberRepository.deleteAll();

        firstMemberId = memberRepository.save(Member.create(
                "first@example.com",
                "encoded-password",
                "first"
        )).getId();
        secondMemberId = memberRepository.save(Member.create(
                "second@example.com",
                "encoded-password",
                "second"
        )).getId();

        Room room = Room.create(firstMemberId, "테스트 방", GameMode.COOPERATE, null, 2);
        roomId = roomRepository.save(room).getId();
        roomMemberRepository.save(RoomMember.create(roomId, firstMemberId));
        roomMemberRepository.save(RoomMember.create(roomId, secondMemberId));

        gameId = gameRepository.save(Game.start(roomId)).getId();
        BingoBoard board = bingoBoardRepository.save(BingoBoard.create(gameId, 2));
        boardId = board.getId();

        BingoCell approvedCell = BingoCell.create(boardId, 1L, 0, 0);
        approvedCell.submit(firstMemberId, "https://example.com/approved.png");
        approvedCell.approve();
        bingoCellRepository.save(approvedCell);

        BingoCell firstPendingCell = BingoCell.create(boardId, 2L, 0, 1);
        firstPendingCell.submit(firstMemberId, "https://example.com/first.png");
        firstPendingCellId = bingoCellRepository.save(firstPendingCell).getId();

        BingoCell secondPendingCell = BingoCell.create(boardId, 3L, 1, 0);
        secondPendingCell.submit(secondMemberId, "https://example.com/second.png");
        secondPendingCellId = bingoCellRepository.save(secondPendingCell).getId();

        BingoCell fourthApprovedCell = BingoCell.create(boardId, 4L, 1, 1);
        fourthApprovedCell.submit(secondMemberId, "https://example.com/fourth.png");
        fourthApprovedCell.approve();
        bingoCellRepository.save(fourthApprovedCell);
    }

    @Test
    @DisplayName("협동 모드는 서로 다른 셀의 동시 승인으로 보드가 완성되어도 게임 결과를 생성하지 않는다")
    void doesNotCreateGameResultWhenCooperateCellsAreApprovedConcurrently() throws Exception {
        // given
        CountDownLatch readyLatch = new CountDownLatch(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<?> first = executor.submit(() -> approveAfterSignal(firstPendingCellId, readyLatch, startLatch));
            Future<?> second = executor.submit(() -> approveAfterSignal(secondPendingCellId, readyLatch, startLatch));
            readyLatch.await();

            // when
            startLatch.countDown();
            first.get();
            second.get();

            // then
            Room room = roomRepository.findById(roomId).orElseThrow();
            BingoBoard board = bingoBoardRepository.findById(boardId).orElseThrow();
            List<RoomMember> roomMembers = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(roomId);

            assertThat(room.getStatus()).isEqualTo(RoomStatus.ACTIVE);
            assertThat(board.getStatus()).isEqualTo(BingoBoardStatus.ACTIVE);
            assertThat(gameRepository.findById(gameId).orElseThrow().getStatus()).isEqualTo(GameStatus.ACTIVE);
            assertThat(gameResultRepository.count()).isZero();
            assertThat(gameResultParticipantRepository.count()).isZero();
            assertThat(pointHistoryRepository.count()).isEqualTo(2);
            assertThat(memberRepository.findById(firstMemberId).orElseThrow().getPoint()).isEqualTo(30L);
            assertThat(memberRepository.findById(secondMemberId).orElseThrow().getPoint()).isEqualTo(30L);
            assertThat(roomMembers).hasSize(2);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    @DisplayName("대결 참가자가 동시에 목표 빙고를 달성해도 승자와 결과는 하나만 확정된다")
    void determinesSingleWinnerWhenBattleParticipantsCompleteConcurrently() throws Exception {
        // given
        Room battleRoom = Room.create(firstMemberId, "테스트 방", GameMode.BATTLE, 1, 2);
        Long battleRoomId = roomRepository.saveAndFlush(battleRoom).getId();
        RoomMember firstRoomMember =
                roomMemberRepository.saveAndFlush(RoomMember.create(battleRoomId, firstMemberId));
        RoomMember secondRoomMember =
                roomMemberRepository.saveAndFlush(RoomMember.create(battleRoomId, secondMemberId));
        Game battleGame = gameRepository.saveAndFlush(Game.start(battleRoomId));
        GameParticipant firstParticipant = gameParticipantRepository.saveAndFlush(
                GameParticipant.create(battleGame.getId(), firstRoomMember.getMemberId()));
        GameParticipant secondParticipant = gameParticipantRepository.saveAndFlush(
                GameParticipant.create(battleGame.getId(), secondRoomMember.getMemberId()));
        BingoBoard firstBoard = bingoBoardRepository.saveAndFlush(
                BingoBoard.createForBattle(battleGame.getId(), firstParticipant.getId(), 2, 1));
        BingoBoard secondBoard = bingoBoardRepository.saveAndFlush(
                BingoBoard.createForBattle(battleGame.getId(), secondParticipant.getId(), 2, 1));
        Long firstBattleCellId = saveBattleBoardWithPendingWinningCell(firstBoard.getId(), firstMemberId, 21L);
        Long secondBattleCellId = saveBattleBoardWithPendingWinningCell(secondBoard.getId(), secondMemberId, 31L);

        CountDownLatch readyLatch = new CountDownLatch(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<?> first = executor.submit(() ->
                    approveAfterSignal(firstBattleCellId, readyLatch, startLatch));
            Future<?> second = executor.submit(() ->
                    approveAfterSignal(secondBattleCellId, readyLatch, startLatch));
            readyLatch.await();

            // when
            startLatch.countDown();
            first.get();
            second.get();

            // then
            assertThat(gameRepository.findById(battleGame.getId()).orElseThrow().getStatus())
                    .isEqualTo(GameStatus.ENDED);
            assertThat(roomRepository.findById(battleRoomId).orElseThrow().getStatus())
                    .isEqualTo(RoomStatus.ACTIVE);
            assertThat(bingoBoardRepository.findAllByGameIdOrderByIdAsc(battleGame.getId()))
                    .extracting(BingoBoard::getStatus)
                    .containsOnly(BingoBoardStatus.COMPLETED);
            assertThat(gameResultRepository.count()).isEqualTo(1);
            assertThat(gameResultParticipantRepository.findAllByGameIdOrderByIdAsc(battleGame.getId()))
                    .filteredOn(participant -> Boolean.TRUE.equals(participant.getResult()))
                    .hasSize(1);
            assertThat(gameResultParticipantRepository.findAllByGameIdOrderByIdAsc(battleGame.getId()))
                    .filteredOn(participant -> Boolean.FALSE.equals(participant.getResult()))
                    .hasSize(1);
            assertThat(pointHistoryRepository.count()).isEqualTo(4);
            assertThat(memberRepository.findById(firstMemberId).orElseThrow().getPoint()
                    + memberRepository.findById(secondMemberId).orElseThrow().getPoint())
                    .isEqualTo(410L);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void doesNotCompleteCooperateGameUntilRenewal() {
        verificationResultService.applyResult(firstPendingCellId, true, null, MissionDifficulty.LOW);
        verificationResultService.applyResult(secondPendingCellId, true, null, MissionDifficulty.LOW);

        assertThat(roomRepository.findById(roomId).orElseThrow().getStatus()).isEqualTo(RoomStatus.ACTIVE);
        assertThat(gameResultRepository.count()).isZero();
        assertThat(gameRepository.findAll())
                .extracting(Game::getStatus)
                .containsOnly(GameStatus.ACTIVE);
        assertThat(bingoBoardRepository.findAllByGameIdOrderByIdAsc(gameId))
                .extracting(BingoBoard::getStatus)
                .containsExactly(BingoBoardStatus.ACTIVE);
        assertThat(gameResultParticipantRepository.count()).isZero();
        assertThat(pointHistoryRepository.count()).isEqualTo(2);
        assertThat(memberRepository.findById(firstMemberId).orElseThrow().getPoint()).isEqualTo(30L);
        assertThat(memberRepository.findById(secondMemberId).orElseThrow().getPoint()).isEqualTo(30L);
    }

    private Long saveBattleBoardWithPendingWinningCell(Long targetBoardId, Long memberId, Long missionId) {
        BingoCell approvedCell = BingoCell.create(targetBoardId, missionId, 0, 0);
        approvedCell.submit(memberId, "https://example.com/battle-approved-" + memberId + ".png");
        approvedCell.approve();
        bingoCellRepository.save(approvedCell);

        BingoCell pendingCell = BingoCell.create(targetBoardId, missionId + 1, 0, 1);
        pendingCell.submit(memberId, "https://example.com/battle-pending-" + memberId + ".png");
        Long pendingCellId = bingoCellRepository.save(pendingCell).getId();

        bingoCellRepository.save(BingoCell.create(targetBoardId, missionId + 2, 1, 0));
        bingoCellRepository.save(BingoCell.create(targetBoardId, missionId + 3, 1, 1));
        return pendingCellId;
    }

    private void approveAfterSignal(
            Long cellId,
            CountDownLatch readyLatch,
            CountDownLatch startLatch
    ) {
        readyLatch.countDown();
        try {
            startLatch.await();
            verificationResultService.applyResult(cellId, true, null, MissionDifficulty.LOW);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }
}
