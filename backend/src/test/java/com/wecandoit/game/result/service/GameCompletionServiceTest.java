package com.wecandoit.game.result.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.point.repository.PointHistoryRepository;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameParticipant;
import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.GameResultParticipant;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.GameResultParticipantRepository;
import com.wecandoit.game.repository.GameResultRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.GameCompletionService;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.notification.event.NotificationMessageFactory;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("대결 게임 완료 서비스")
class GameCompletionServiceTest {

    @Mock
    private RoomRepository roomRepository;

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
    private MemberRepository memberRepository;

    @Mock
    private PointHistoryRepository pointHistoryRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private GameCompletionService gameCompletionService;

    @BeforeEach
    void setUp() {
        gameCompletionService = new GameCompletionService(
                roomRepository,
                gameRepository,
                gameParticipantRepository,
                gameResultRepository,
                gameResultParticipantRepository,
                bingoBoardRepository,
                bingoCellRepository,
                memberRepository,
                pointHistoryRepository,
                eventPublisher,
                new NotificationMessageFactory()
        );
    }

    @Test
    @DisplayName("공유 모드는 셀 승인 시 즉시 결과를 생성하지 않는다")
    void sharedModeDoesNotCompleteImmediately() {
        Game game = game(200L, 10L);
        Room room = room(10L, GameMode.COOPERATE);
        given(gameRepository.findByIdForUpdate(200L)).willReturn(Optional.of(game));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));

        gameCompletionService.evaluateAndCompleteIfNeeded(200L, 100L);

        assertThat(game.getStatus()).isEqualTo(GameStatus.ACTIVE);
        then(gameResultRepository).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("목표 빙고에 도달하지 않으면 대결을 종료하지 않는다")
    void targetNotReachedDoesNotCompleteBattle() {
        BattleFixture fixture = battleFixture();
        givenContext(fixture, List.of(
                approvedCell(100L, 1L, 0, 0),
                emptyCell(100L, 2L, 0, 1),
                emptyCell(100L, 3L, 1, 0),
                emptyCell(100L, 4L, 1, 1),
                emptyCell(101L, 5L, 0, 0),
                emptyCell(101L, 6L, 0, 1),
                emptyCell(101L, 7L, 1, 0),
                emptyCell(101L, 8L, 1, 1)
        ));

        gameCompletionService.evaluateAndCompleteIfNeeded(200L, 100L);

        assertThat(fixture.game().getStatus()).isEqualTo(GameStatus.ACTIVE);
        then(gameResultRepository).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("개인 보드가 목표 빙고에 도달하면 참가자 스냅샷으로 결과를 만든다")
    void completedBattleCreatesParticipantResults() {
        BattleFixture fixture = battleFixture();
        List<BingoCell> cells = List.of(
                approvedCell(100L, 1L, 0, 0),
                approvedCell(100L, 2L, 0, 1),
                emptyCell(100L, 3L, 1, 0),
                emptyCell(100L, 4L, 1, 1),
                approvedCell(101L, 5L, 0, 0),
                emptyCell(101L, 6L, 0, 1),
                emptyCell(101L, 7L, 1, 0),
                emptyCell(101L, 8L, 1, 1)
        );
        givenContext(fixture, cells);
        given(gameParticipantRepository.findAllByGameIdOrderByJoinedAtAsc(200L))
                .willReturn(List.of(fixture.host(), fixture.guest()));
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(member(1L)));
        given(memberRepository.findByIdForUpdate(2L)).willReturn(Optional.of(member(2L)));

        gameCompletionService.evaluateAndCompleteIfNeeded(200L, 100L);

        assertThat(fixture.game().getStatus()).isEqualTo(GameStatus.ENDED);
        assertThat(fixture.room().getStatus()).isEqualTo(RoomStatus.ACTIVE);
        assertThat(fixture.boards())
                .extracting(BingoBoard::getStatus)
                .containsOnly(BingoBoardStatus.COMPLETED);

        ArgumentCaptor<GameResult> resultCaptor = ArgumentCaptor.forClass(GameResult.class);
        then(gameResultRepository).should().saveAndFlush(resultCaptor.capture());
        assertThat(resultCaptor.getValue().isResult()).isTrue();
        assertThat(resultCaptor.getValue().getCompletedMissionCount()).isEqualTo(2);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<GameResultParticipant>> participantCaptor =
                ArgumentCaptor.forClass(List.class);
        then(gameResultParticipantRepository).should().saveAll(participantCaptor.capture());
        assertThat(participantCaptor.getValue())
                .extracting(GameResultParticipant::getMemberId, GameResultParticipant::getResult)
                .containsExactlyInAnyOrder(
                        tuple(1L, true),
                        tuple(2L, false)
                );
    }

    @Test
    @DisplayName("검증 중인 셀이 있으면 대결 종료를 보류한다")
    void pendingCellDefersBattleCompletion() {
        BattleFixture fixture = battleFixture();
        BingoCell pending = emptyCell(101L, 8L, 1, 1);
        pending.submit(2L, "https://example.com/pending.png");
        givenContext(fixture, List.of(
                approvedCell(100L, 1L, 0, 0),
                approvedCell(100L, 2L, 0, 1),
                pending
        ));

        gameCompletionService.evaluateAndCompleteIfNeeded(200L, 100L);

        assertThat(fixture.game().getStatus()).isEqualTo(GameStatus.ACTIVE);
        then(gameResultRepository).shouldHaveNoInteractions();
    }

    private void givenContext(BattleFixture fixture, List<BingoCell> cells) {
        given(gameRepository.findByIdForUpdate(200L)).willReturn(Optional.of(fixture.game()));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(fixture.room()));
        given(bingoBoardRepository.findAllByGameIdOrderByIdAsc(200L))
                .willReturn(fixture.boards());
        given(bingoCellRepository.findAllByBoardIdIn(List.of(100L, 101L))).willReturn(cells);
    }

    private BattleFixture battleFixture() {
        Room room = room(10L, GameMode.BATTLE);
        Game game = game(200L, 10L);
        GameParticipant host = participant(1L, 200L, 1L);
        GameParticipant guest = participant(2L, 200L, 2L);
        BingoBoard hostBoard = board(100L, game.getId(), host);
        BingoBoard guestBoard = board(101L, game.getId(), guest);
        return new BattleFixture(room, game, host, guest, List.of(hostBoard, guestBoard));
    }

    private Room room(Long id, GameMode mode) {
        Room room = Room.create(1L, "대결 방", mode, 1, null, 2);
        ReflectionTestUtils.setField(room, "id", id);
        return room;
    }

    private Game game(Long id, Long roomId) {
        Game game = Game.start(roomId);
        ReflectionTestUtils.setField(game, "id", id);
        return game;
    }

    private GameParticipant participant(Long id, Long gameId, Long memberId) {
        GameParticipant participant = GameParticipant.create(gameId, memberId);
        ReflectionTestUtils.setField(participant, "id", id);
        return participant;
    }

    private BingoBoard board(Long id, Long gameId, GameParticipant participant) {
        BingoBoard board = BingoBoard.createForBattle(gameId, participant.getId(), 2, 1);
        ReflectionTestUtils.setField(board, "id", id);
        return board;
    }

    private BingoCell approvedCell(Long boardId, Long missionId, int row, int col) {
        BingoCell cell = BingoCell.create(boardId, missionId, row, col);
        cell.submit(boardId.equals(100L) ? 1L : 2L, "https://example.com/proof.png");
        cell.approve();
        return cell;
    }

    private BingoCell emptyCell(Long boardId, Long missionId, int row, int col) {
        return BingoCell.create(boardId, missionId, row, col);
    }

    private Member member(Long id) {
        Member member = Member.builder()
                .email(id + "@example.com")
                .nickname("member" + id)
                .build();
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }

    private record BattleFixture(
            Room room,
            Game game,
            GameParticipant host,
            GameParticipant guest,
            List<BingoBoard> boards
    ) {
    }
}
