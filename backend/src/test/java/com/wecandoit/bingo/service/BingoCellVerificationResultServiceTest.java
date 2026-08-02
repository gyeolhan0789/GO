package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.bingo.event.BattleBingoProgressUpdatedEvent;
import com.wecandoit.bingo.event.CooperativeBingoProgressUpdatedEvent;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.cash.service.CashCommandService;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.GameCompletionService;
import com.wecandoit.mission.domain.MissionType;
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
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("빙고 셀 검증 결과 서비스")
@ExtendWith(MockitoExtension.class)
class BingoCellVerificationResultServiceTest {

    @Mock
    private BingoCellRepository bingoCellRepository;
    @Mock
    private BingoBoardRepository bingoBoardRepository;
    @Mock
    private GameRepository gameRepository;
    @Mock
    private RoomRepository roomRepository;
    @Mock
    private CashCommandService cashCommandService;
    @Mock
    private GameCompletionService gameCompletionService;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @InjectMocks
    private BingoCellVerificationResultService verificationResultService;

    @Test
    @DisplayName("승인 결과는 셀을 완료 처리하고 게임 완료 여부를 재평가한다")
    void applyApprovedResultCompletesCellAndEvaluatesGameCompletion() {
        // given
        BingoCell cell = cell(1000L, 100L);
        BingoBoard board = board(100L, 200L);
        Game game = game(200L, 10L);
        given(bingoCellRepository.findByIdForUpdate(1000L)).willReturn(Optional.of(cell));
        given(bingoBoardRepository.findById(100L)).willReturn(Optional.of(board));
        given(gameRepository.findByIdForUpdate(200L)).willReturn(Optional.of(game));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(inProgressRoom(10L)));
        given(bingoCellRepository.save(cell)).willReturn(cell);
        given(cashCommandService.grantBingoCellReward(1L, 10L, 1000L, MissionType.OBJECT)).willReturn(30L);

        // when
        long rewardCash = verificationResultService.applyResult(1000L, true, null, MissionType.OBJECT);

        // then
        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.APPROVED);
        assertThat(cell.getRejectionReason()).isNull();
        assertThat(cell.getCompletedAt()).isNotNull();
        assertThat(rewardCash).isEqualTo(30L);
        then(cashCommandService).should().grantBingoCellReward(1L, 10L, 1000L, MissionType.OBJECT);
        then(gameCompletionService).should().evaluateAndCompleteIfNeeded(200L, 100L);
    }

    @Test
    @DisplayName("거절 결과는 완료 처리하지 않고 거절 사유를 저장한다")
    void applyRejectedResultStoresReasonWithoutCompletingCell() {
        // given
        BingoCell cell = cell(1000L, 100L);
        BingoBoard board = board(100L, 200L);
        Game game = game(200L, 10L);
        given(bingoCellRepository.findByIdForUpdate(1000L)).willReturn(Optional.of(cell));
        given(bingoBoardRepository.findById(100L)).willReturn(Optional.of(board));
        given(gameRepository.findByIdForUpdate(200L)).willReturn(Optional.of(game));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(inProgressRoom(10L)));
        given(bingoCellRepository.save(cell)).willReturn(cell);

        // when
        long rewardCash = verificationResultService.applyResult(
                1000L,
                false,
                "인증 이미지가 조건과 다릅니다.",
                MissionType.OBJECT
        );

        // then
        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.REJECTED);
        assertThat(cell.getRejectionReason()).isEqualTo("인증 이미지가 조건과 다릅니다.");
        assertThat(cell.getCompletedAt()).isNull();
        assertThat(rewardCash).isZero();
        then(cashCommandService).shouldHaveNoInteractions();
        then(gameCompletionService).should(never())
                .evaluateAndCompleteIfNeeded(anyLong(), anyLong());
    }

    @Test
    @DisplayName("협동 모드 승인 결과는 변경된 셀과 최신 진행 상황 이벤트를 발행한다")
    void applyApprovedResultPublishesCooperativeProgressEvent() {
        // given
        BingoCell changedCell = cell(1000L, 100L, 0, 0);
        BingoCell approvedCell = approvedCell(1001L, 100L, 0, 1);
        BingoBoard board = board(100L, 200L);
        Game game = game(200L, 10L);
        given(bingoCellRepository.findByIdForUpdate(1000L)).willReturn(Optional.of(changedCell));
        given(bingoBoardRepository.findById(100L)).willReturn(Optional.of(board));
        given(gameRepository.findByIdForUpdate(200L)).willReturn(Optional.of(game));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(inProgressRoom(10L, GameMode.COOPERATE)));
        given(bingoCellRepository.save(changedCell)).willReturn(changedCell);
        given(bingoCellRepository.findAllByBoardId(100L)).willReturn(List.of(changedCell, approvedCell));
        given(cashCommandService.grantBingoCellReward(1L, 10L, 1000L, MissionType.OBJECT)).willReturn(30L);

        // when
        verificationResultService.applyResult(1000L, true, null, MissionType.OBJECT);

        // then
        ArgumentCaptor<CooperativeBingoProgressUpdatedEvent> eventCaptor =
                ArgumentCaptor.forClass(CooperativeBingoProgressUpdatedEvent.class);
        then(eventPublisher).should().publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue()).isEqualTo(new CooperativeBingoProgressUpdatedEvent(
                10L,
                100L,
                1000L,
                BingoCellVerificationStatus.APPROVED,
                1L,
                null,
                2,
                1
        ));
        then(eventPublisher).should(never()).publishEvent(any(BattleBingoProgressUpdatedEvent.class));
    }

    @Test
    @DisplayName("협동 모드 거절 결과는 거절된 셀과 유지된 진행 상황 이벤트를 발행한다")
    void applyRejectedResultPublishesCooperativeProgressEvent() {
        // given
        BingoCell changedCell = cell(1000L, 100L, 0, 0);
        BingoCell approvedCell = approvedCell(1001L, 100L, 0, 1);
        BingoBoard board = board(100L, 200L);
        Game game = game(200L, 10L);
        given(bingoCellRepository.findByIdForUpdate(1000L)).willReturn(Optional.of(changedCell));
        given(bingoBoardRepository.findById(100L)).willReturn(Optional.of(board));
        given(gameRepository.findByIdForUpdate(200L)).willReturn(Optional.of(game));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(inProgressRoom(10L, GameMode.COOPERATE)));
        given(bingoCellRepository.save(changedCell)).willReturn(changedCell);
        given(bingoCellRepository.findAllByBoardId(100L)).willReturn(List.of(changedCell, approvedCell));

        // when
        verificationResultService.applyResult(
                1000L,
                false,
                "인증 이미지가 조건과 다릅니다.",
                MissionType.OBJECT
        );

        // then
        ArgumentCaptor<CooperativeBingoProgressUpdatedEvent> eventCaptor =
                ArgumentCaptor.forClass(CooperativeBingoProgressUpdatedEvent.class);
        then(eventPublisher).should().publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue()).isEqualTo(new CooperativeBingoProgressUpdatedEvent(
                10L,
                100L,
                1000L,
                BingoCellVerificationStatus.REJECTED,
                1L,
                "인증 이미지가 조건과 다릅니다.",
                1,
                0
        ));
        then(eventPublisher).should(never()).publishEvent(any(BattleBingoProgressUpdatedEvent.class));
    }

    @Test
    @DisplayName("대결 모드 승인 결과는 해당 참가자의 최신 진행률 이벤트를 발행한다")
    void applyApprovedResultPublishesBattleProgressEvent() {
        // given
        BingoCell changedCell = cell(1000L, 100L, 0, 0);
        BingoCell approvedCell = approvedCell(1001L, 100L, 0, 1);
        BingoBoard board = battleBoard(100L, 200L, 300L, 1);
        Game game = game(200L, 10L);
        given(bingoCellRepository.findByIdForUpdate(1000L)).willReturn(Optional.of(changedCell));
        given(bingoBoardRepository.findById(100L)).willReturn(Optional.of(board));
        given(gameRepository.findByIdForUpdate(200L)).willReturn(Optional.of(game));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(inProgressRoom(10L, GameMode.BATTLE)));
        given(bingoCellRepository.save(changedCell)).willReturn(changedCell);
        given(bingoCellRepository.findAllByBoardId(100L)).willReturn(List.of(changedCell, approvedCell));
        given(cashCommandService.grantBingoCellReward(1L, 10L, 1000L, MissionType.OBJECT)).willReturn(30L);

        // when
        verificationResultService.applyResult(1000L, true, null, MissionType.OBJECT);

        // then
        ArgumentCaptor<BattleBingoProgressUpdatedEvent> eventCaptor =
                ArgumentCaptor.forClass(BattleBingoProgressUpdatedEvent.class);
        then(eventPublisher).should().publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue()).isEqualTo(new BattleBingoProgressUpdatedEvent(
                10L,
                200L,
                1L,
                100L,
                2,
                1,
                true
        ));
        then(eventPublisher).should(never()).publishEvent(any(CooperativeBingoProgressUpdatedEvent.class));
    }

    @Test
    @DisplayName("대결 모드 거절 결과도 상세 정보 없이 유지된 진행률 이벤트를 발행한다")
    void applyRejectedResultPublishesBattleProgressEvent() {
        // given
        BingoCell changedCell = cell(1000L, 100L, 0, 0);
        BingoCell approvedCell = approvedCell(1001L, 100L, 0, 1);
        BingoBoard board = battleBoard(100L, 200L, 300L, 1);
        Game game = game(200L, 10L);
        given(bingoCellRepository.findByIdForUpdate(1000L)).willReturn(Optional.of(changedCell));
        given(bingoBoardRepository.findById(100L)).willReturn(Optional.of(board));
        given(gameRepository.findByIdForUpdate(200L)).willReturn(Optional.of(game));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(inProgressRoom(10L, GameMode.BATTLE)));
        given(bingoCellRepository.save(changedCell)).willReturn(changedCell);
        given(bingoCellRepository.findAllByBoardId(100L)).willReturn(List.of(changedCell, approvedCell));

        // when
        verificationResultService.applyResult(
                1000L,
                false,
                "인증 이미지가 조건과 다릅니다.",
                MissionType.OBJECT
        );

        // then
        ArgumentCaptor<BattleBingoProgressUpdatedEvent> eventCaptor =
                ArgumentCaptor.forClass(BattleBingoProgressUpdatedEvent.class);
        then(eventPublisher).should().publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue()).isEqualTo(new BattleBingoProgressUpdatedEvent(
                10L,
                200L,
                1L,
                100L,
                1,
                0,
                false
        ));
        then(eventPublisher).should(never()).publishEvent(any(CooperativeBingoProgressUpdatedEvent.class));
    }

    @Test
    @DisplayName("싱글 모드에서는 빙고 진행 이벤트를 발행하지 않는다")
    void applyResultDoesNotPublishProgressEventInSingleMode() {
        // given
        BingoCell cell = cell(1000L, 100L);
        BingoBoard board = board(100L, 200L);
        Game game = game(200L, 10L);
        given(bingoCellRepository.findByIdForUpdate(1000L)).willReturn(Optional.of(cell));
        given(bingoBoardRepository.findById(100L)).willReturn(Optional.of(board));
        given(gameRepository.findByIdForUpdate(200L)).willReturn(Optional.of(game));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(inProgressRoom(10L, GameMode.SINGLE)));
        given(bingoCellRepository.save(cell)).willReturn(cell);
        given(cashCommandService.grantBingoCellReward(1L, 10L, 1000L, MissionType.OBJECT)).willReturn(30L);

        // when
        verificationResultService.applyResult(1000L, true, null, MissionType.OBJECT);

        // then
        then(eventPublisher).shouldHaveNoInteractions();
        then(bingoCellRepository).should(never()).findAllByBoardId(anyLong());
    }

    @Test
    @DisplayName("종료된 방의 늦은 인증 결과는 반영하지 않는다")
    void applyResultIgnoresClosedRoom() {
        // given
        BingoCell cell = cell(1000L, 100L);
        BingoBoard board = board(100L, 200L);
        Game game = game(200L, 10L);
        Room closedRoom = inProgressRoom(10L);
        closedRoom.close();
        given(bingoCellRepository.findByIdForUpdate(1000L)).willReturn(Optional.of(cell));
        given(bingoBoardRepository.findById(100L)).willReturn(Optional.of(board));
        given(gameRepository.findByIdForUpdate(200L)).willReturn(Optional.of(game));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(closedRoom));

        // when
        long rewardCash = verificationResultService.applyResult(1000L, true, null, MissionType.OBJECT);

        // then
        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.PENDING);
        assertThat(rewardCash).isZero();
        then(bingoCellRepository).should(never()).save(cell);
        then(cashCommandService).shouldHaveNoInteractions();
        then(gameCompletionService).shouldHaveNoInteractions();
    }

    @Test
    void applyResultIgnoresACompletedGameEvenWhenTheRoomIsReused() {
        BingoCell cell = cell(1000L, 100L);
        BingoBoard board = board(100L, 200L);
        Game completedGame = game(200L, 10L);
        completedGame.complete();
        given(bingoCellRepository.findByIdForUpdate(1000L)).willReturn(Optional.of(cell));
        given(bingoBoardRepository.findById(100L)).willReturn(Optional.of(board));
        given(gameRepository.findByIdForUpdate(200L)).willReturn(Optional.of(completedGame));

        long rewardCash = verificationResultService.applyResult(1000L, true, null, MissionType.OBJECT);

        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.PENDING);
        assertThat(rewardCash).isZero();
        then(roomRepository).shouldHaveNoInteractions();
        then(bingoCellRepository).should(never()).save(cell);
        then(cashCommandService).shouldHaveNoInteractions();
        then(gameCompletionService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("검증 대기 상태가 아닌 칸에 도착한 결과는 반영하지 않는다")
    void applyResultIgnoresCellNotPending() {
        // given
        BingoCell cell = cell(1000L, 100L);
        cell.reject("이전 검증에서 거절되었습니다.");
        BingoBoard board = board(100L, 200L);
        Game game = game(200L, 10L);
        given(bingoCellRepository.findByIdForUpdate(1000L)).willReturn(Optional.of(cell));
        given(bingoBoardRepository.findById(100L)).willReturn(Optional.of(board));
        given(gameRepository.findByIdForUpdate(200L)).willReturn(Optional.of(game));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(inProgressRoom(10L)));

        // when
        long rewardCash = verificationResultService.applyResult(1000L, true, null, MissionType.OBJECT);

        // then
        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.REJECTED);
        assertThat(rewardCash).isZero();
        then(bingoCellRepository).should(never()).save(cell);
        then(cashCommandService).shouldHaveNoInteractions();
        then(gameCompletionService).shouldHaveNoInteractions();
    }

    private BingoCell cell(Long id, Long boardId) {
        return cell(id, boardId, 0, 0);
    }

    private BingoCell cell(Long id, Long boardId, int row, int col) {
        BingoCell cell = BingoCell.create(boardId, 1L, row, col);
        ReflectionTestUtils.setField(cell, "id", id);
        cell.submit(1L, "https://example.com/proof.png");
        return cell;
    }

    private BingoCell approvedCell(Long id, Long boardId, int row, int col) {
        BingoCell cell = cell(id, boardId, row, col);
        cell.approve();
        return cell;
    }

    private BingoBoard board(Long id, Long gameId) {
        BingoBoard board = BingoBoard.create(gameId, 2);
        ReflectionTestUtils.setField(board, "id", id);
        return board;
    }

    private BingoBoard battleBoard(Long id, Long gameId, Long gameParticipantId, int targetBingoCount) {
        BingoBoard board = BingoBoard.createForBattle(gameId, gameParticipantId, 2, targetBingoCount);
        ReflectionTestUtils.setField(board, "id", id);
        return board;
    }

    private Game game(Long gameId, Long roomId) {
        Game game = Game.start(roomId);
        ReflectionTestUtils.setField(game, "id", gameId);
        return game;
    }

    private Room inProgressRoom(Long roomId) {
        return inProgressRoom(roomId, GameMode.SINGLE);
    }

    private Room inProgressRoom(Long roomId, GameMode gameMode) {
        Room room = Room.create(1L, "테스트 방", gameMode, null, 3);
        ReflectionTestUtils.setField(room, "id", roomId);
        ReflectionTestUtils.setField(room, "status", RoomStatus.ACTIVE);
        return room;
    }
}
