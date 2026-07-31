package com.wecandoit.game.result.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.bingo.controller.response.BingoBoardResponse;
import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.cash.repository.CashHistoryRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameParticipant;
import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameResultParticipantRepository;
import com.wecandoit.game.repository.GameResultRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.GameCycleCommandService;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.repository.MissionRepository;
import com.wecandoit.notification.event.NotificationMessageFactory;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("게임 회차 서비스")
@ExtendWith(MockitoExtension.class)
class GameCycleCommandServiceTest {

    private static final List<BingoBoardStatus> INACTIVE_BOARD_STATUSES =
            List.of(BingoBoardStatus.COMPLETED, BingoBoardStatus.EXPIRED);

    @Mock
    private RoomRepository roomRepository;
    @Mock
    private RoomMemberRepository roomMemberRepository;
    @Mock
    private GameRepository gameRepository;
    @Mock
    private GameParticipantRepository gameParticipantRepository;
    @Mock
    private GameResultRepository gameResultRepository;
    @Mock
    private GameResultParticipantRepository gameResultParticipantRepository;
    @Mock
    private BingoBoardRepository bingoBoardRepository;
    @Mock
    private BingoCellRepository bingoCellRepository;
    @Mock
    private MissionRepository missionRepository;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private CashHistoryRepository cashHistoryRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private NotificationMessageFactory notificationMessageFactory;
    @InjectMocks
    private GameCycleCommandService gameCycleCommandService;

    @Test
    @DisplayName("완료된 공유 보드를 7일 전에 갱신하면 현재 시각으로 성공 결과를 만들고 다음 보드를 발급한다")
    void renewSharedCycleCreatesSuccessResultForEarlyCompletedBoard() {
        // given
        LocalDateTime startedAt = LocalDateTime.now().minusDays(1);
        Room room = inProgressRoom(GameMode.COOPERATE);
        Game game = activeGame(200L, 10L, startedAt);
        BingoBoard board = sharedBoard(100L, 200L);
        List<BingoCell> cells = approvedCells(100L, 4, LocalDateTime.now().minusHours(1));
        givenRenewalContext(room, game, board, cells);
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(member(1L)));
        given(memberRepository.findByIdForUpdate(2L)).willReturn(Optional.of(member(2L)));
        LocalDateTime beforeRenewal = LocalDateTime.now();

        // when
        BingoBoardResponse response =
                gameCycleCommandService.renewSharedCycle(1L, 10L, 3, 2, 12_000);

        // then
        LocalDateTime afterRenewal = LocalDateTime.now();
        ArgumentCaptor<GameResult> resultCaptor = ArgumentCaptor.forClass(GameResult.class);
        then(gameResultRepository).should().saveAndFlush(resultCaptor.capture());
        assertThat(resultCaptor.getValue().isResult()).isTrue();
        assertThat(resultCaptor.getValue().getCompletedMissionCount()).isEqualTo(4);
        assertThat(resultCaptor.getValue().getRewardCash()).isEqualTo(200L);
        assertThat(game.getCompletedAt()).isBetween(beforeRenewal, afterRenewal);
        assertThat(board.getStatus()).isEqualTo(BingoBoardStatus.COMPLETED);
        assertThat(board.getCompletedAt()).isEqualTo(game.getCompletedAt());
        assertThat(response.gameId()).isEqualTo(201L);
        assertThat(response.targetStepCount()).isEqualTo(12_000);
    }

    @Test
    @DisplayName("7일 지난 미완료 공유 보드를 갱신하면 주기 종료 시각으로 실패 결과를 만든다")
    void renewSharedCycleCreatesFailureResultForExpiredIncompleteBoard() {
        // given
        LocalDateTime startedAt = LocalDateTime.now().minusDays(8);
        LocalDateTime expectedCompletedAt = startedAt.plusDays(7);
        Room room = inProgressRoom(GameMode.SINGLE);
        Game game = activeGame(200L, 10L, startedAt);
        BingoBoard board = sharedBoard(100L, 200L);
        List<BingoCell> cells = cellsWithApprovedCount(100L, 4, 2, expectedCompletedAt.minusHours(1));
        givenRenewalContext(room, game, board, cells);

        // when
        gameCycleCommandService.renewSharedCycle(1L, 10L, 3, 2, 12_000);

        // then
        ArgumentCaptor<GameResult> resultCaptor = ArgumentCaptor.forClass(GameResult.class);
        then(gameResultRepository).should().saveAndFlush(resultCaptor.capture());
        assertThat(resultCaptor.getValue().isResult()).isFalse();
        assertThat(resultCaptor.getValue().getCompletedMissionCount()).isEqualTo(2);
        assertThat(resultCaptor.getValue().getRewardCash()).isZero();
        assertThat(game.getCompletedAt()).isEqualTo(expectedCompletedAt);
        assertThat(board.getStatus()).isEqualTo(BingoBoardStatus.EXPIRED);
        assertThat(board.getCompletedAt()).isEqualTo(expectedCompletedAt);
    }

    @Test
    @DisplayName("7일이 지난 뒤 갱신해도 주기 안에 완료된 공유 보드는 성공 결과를 만든다")
    void renewSharedCycleCreatesSuccessResultForLateRenewedCompletedBoard() {
        // given
        LocalDateTime startedAt = LocalDateTime.now().minusDays(8);
        LocalDateTime expectedCompletedAt = startedAt.plusDays(7);
        Room room = inProgressRoom(GameMode.COOPERATE);
        Game game = activeGame(200L, 10L, startedAt);
        BingoBoard board = sharedBoard(100L, 200L);
        List<BingoCell> cells = approvedCells(100L, 4, expectedCompletedAt.minusHours(1));
        givenRenewalContext(room, game, board, cells);
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(member(1L)));
        given(memberRepository.findByIdForUpdate(2L)).willReturn(Optional.of(member(2L)));

        // when
        gameCycleCommandService.renewSharedCycle(1L, 10L, 3, 2, 12_000);

        // then
        ArgumentCaptor<GameResult> resultCaptor = ArgumentCaptor.forClass(GameResult.class);
        then(gameResultRepository).should().saveAndFlush(resultCaptor.capture());
        assertThat(resultCaptor.getValue().isResult()).isTrue();
        assertThat(game.getCompletedAt()).isEqualTo(expectedCompletedAt);
        assertThat(board.getStatus()).isEqualTo(BingoBoardStatus.COMPLETED);
    }

    @Test
    @DisplayName("7일 전 미완료 공유 보드는 갱신할 수 없다")
    void renewSharedCycleRejectsRecentIncompleteBoard() {
        // given
        Room room = inProgressRoom(GameMode.SINGLE);
        Game game = activeGame(200L, 10L, LocalDateTime.now().minusDays(1));
        BingoBoard board = sharedBoard(100L, 200L);
        List<BingoCell> cells = cellsWithApprovedCount(100L, 4, 2, LocalDateTime.now().minusHours(1));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(gameRepository.findActiveGameForUpdate(10L, GameStatus.ACTIVE)).willReturn(Optional.of(game));
        given(gameResultRepository.existsByGameId(200L)).willReturn(false);
        given(bingoBoardRepository.findActiveBoardForUpdate(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        given(bingoCellRepository.findAllByBoardId(100L)).willReturn(cells);

        // when & then
        assertErrorCode(
                () -> gameCycleCommandService.renewSharedCycle(1L, 10L, 3, 2, 12_000),
                ErrorCode.BINGO_BOARD_NOT_COMPLETED
        );
    }

    @Test
    @DisplayName("대결 모드는 공유 회차 갱신을 할 수 없다")
    void renewSharedCycleRejectsBattleMode() {
        // given
        Room room = inProgressRoom(GameMode.BATTLE);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));

        // when & then
        assertErrorCode(
                () -> gameCycleCommandService.renewSharedCycle(1L, 10L, 3, 2, 12_000),
                ErrorCode.BINGO_BOARD_RENEWAL_FORBIDDEN
        );
    }

    private void givenRenewalContext(Room room, Game game, BingoBoard board, List<BingoCell> cells) {
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(gameRepository.findActiveGameForUpdate(10L, GameStatus.ACTIVE)).willReturn(Optional.of(game));
        given(gameResultRepository.existsByGameId(200L)).willReturn(false);
        given(bingoBoardRepository.findActiveBoardForUpdate(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        given(bingoCellRepository.findAllByBoardId(100L)).willReturn(cells);
        given(gameParticipantRepository.findAllByGameIdOrderByJoinedAtAsc(200L))
                .willReturn(List.of(
                        participant(1L, 200L, 1L),
                        participant(2L, 200L, 2L)
                ));
        given(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L))
                .willReturn(List.of(roomMember(1L, 10L, 1L), roomMember(2L, 10L, 2L)));
        given(gameRepository.save(any(Game.class))).willAnswer(invocation -> {
            Game nextGame = invocation.getArgument(0);
            ReflectionTestUtils.setField(nextGame, "id", 201L);
            return nextGame;
        });
        given(missionRepository.findRandomMissions(9)).willReturn(missions(9));
        given(bingoBoardRepository.save(any(BingoBoard.class))).willAnswer(invocation -> {
            BingoBoard nextBoard = invocation.getArgument(0);
            ReflectionTestUtils.setField(nextBoard, "id", 101L);
            return nextBoard;
        });
        given(bingoCellRepository.save(any(BingoCell.class))).willAnswer(invocation -> invocation.getArgument(0));
    }

    private Room inProgressRoom(GameMode mode) {
        Room room = Room.create(1L, "테스트 방", mode, mode == GameMode.BATTLE ? 3 : null, 10_000, 2);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", RoomStatus.ACTIVE);
        return room;
    }

    private Game activeGame(Long gameId, Long roomId, LocalDateTime startedAt) {
        Game game = Game.start(roomId);
        ReflectionTestUtils.setField(game, "id", gameId);
        ReflectionTestUtils.setField(game, "startedAt", startedAt);
        return game;
    }

    private BingoBoard sharedBoard(Long boardId, Long gameId) {
        BingoBoard board = BingoBoard.create(gameId, 2, 2, 10_000);
        ReflectionTestUtils.setField(board, "id", boardId);
        return board;
    }

    private List<BingoCell> approvedCells(Long boardId, int count, LocalDateTime completedAt) {
        return cellsWithApprovedCount(boardId, count, count, completedAt);
    }

    private List<BingoCell> cellsWithApprovedCount(
            Long boardId,
            int totalCount,
            int approvedCount,
            LocalDateTime completedAt
    ) {
        return IntStream.range(0, totalCount)
                .mapToObj(index -> cell(boardId, index, index < approvedCount, completedAt))
                .toList();
    }

    private BingoCell cell(Long boardId, int index, boolean approved, LocalDateTime completedAt) {
        BingoCell cell = BingoCell.create(boardId, (long) index + 1, index / 2, index % 2);
        ReflectionTestUtils.setField(cell, "id", (long) index + 1);
        if (approved) {
            cell.submit((long) index % 2 + 1, "https://example.com/proof.png");
            ReflectionTestUtils.setField(cell, "submittedAt", completedAt);
            cell.approve();
            ReflectionTestUtils.setField(cell, "completedAt", completedAt);
        }
        return cell;
    }

    private RoomMember roomMember(Long roomMemberId, Long roomId, Long memberId) {
        RoomMember roomMember = RoomMember.create(roomId, memberId);
        ReflectionTestUtils.setField(roomMember, "id", roomMemberId);
        return roomMember;
    }

    private GameParticipant participant(Long id, Long gameId, Long memberId) {
        GameParticipant participant = GameParticipant.create(gameId, memberId);
        ReflectionTestUtils.setField(participant, "id", id);
        return participant;
    }

    private Member member(Long memberId) {
        Member member = Member.builder()
                .email(memberId + "@example.com")
                .nickname("member" + memberId)
                .build();
        ReflectionTestUtils.setField(member, "id", memberId);
        return member;
    }

    private List<Mission> missions(int count) {
        return IntStream.range(0, count)
                .mapToObj(index -> {
                    Mission mission = Mission.create(
                            "https://example.com/mission.png",
                            "OBJECT",
                            "미션",
                            "설명",
                            null
                    );
                    ReflectionTestUtils.setField(mission, "id", (long) index + 1);
                    return mission;
                })
                .toList();
    }

    private void assertErrorCode(Runnable action, ErrorCode errorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(errorCode);
    }
}
