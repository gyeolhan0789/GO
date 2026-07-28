package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.service.GameCompletionService;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.repository.RoomRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
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
    private GameCompletionService gameCompletionService;
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

        // when
        verificationResultService.applyResult(1000L, true, null);

        // then
        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.APPROVED);
        assertThat(cell.getRejectionReason()).isNull();
        assertThat(cell.getCompletedAt()).isNotNull();
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
        verificationResultService.applyResult(1000L, false, "인증 이미지가 조건과 다릅니다.");

        // then
        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.REJECTED);
        assertThat(cell.getRejectionReason()).isEqualTo("인증 이미지가 조건과 다릅니다.");
        assertThat(cell.getCompletedAt()).isNull();
        then(gameCompletionService).should(Mockito.never()).evaluateAndCompleteIfNeeded(Mockito.anyLong());
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
        verificationResultService.applyResult(1000L, true, null);

        // then
        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.PENDING);
        then(bingoCellRepository).should(Mockito.never()).save(cell);
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

        verificationResultService.applyResult(1000L, true, null);

        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.PENDING);
        then(roomRepository).shouldHaveNoInteractions();
        then(bingoCellRepository).should(Mockito.never()).save(cell);
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
        verificationResultService.applyResult(1000L, true, null);

        // then
        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.REJECTED);
        then(bingoCellRepository).should(Mockito.never()).save(cell);
        then(gameCompletionService).shouldHaveNoInteractions();
    }

    private BingoCell cell(Long id, Long boardId) {
        BingoCell cell = BingoCell.create(boardId, 1L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", id);
        cell.submit(1L, "https://example.com/proof.png");
        return cell;
    }

    private BingoBoard board(Long id, Long gameId) {
        BingoBoard board = BingoBoard.create(gameId, 2);
        ReflectionTestUtils.setField(board, "id", id);
        return board;
    }

    private Game game(Long gameId, Long roomId) {
        Game game = Game.start(roomId);
        ReflectionTestUtils.setField(game, "id", gameId);
        return game;
    }

    private Room inProgressRoom(Long roomId) {
        Room room = Room.create(1L, GameMode.SINGLE, null, 3);
        ReflectionTestUtils.setField(room, "id", roomId);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        return room;
    }
}
