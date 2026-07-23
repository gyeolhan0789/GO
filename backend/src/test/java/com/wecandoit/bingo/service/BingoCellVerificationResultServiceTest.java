package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.game.result.service.GameCompletionService;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("빙고 셀 검증 결과 서비스")
class BingoCellVerificationResultServiceTest {

    private final BingoCellRepository bingoCellRepository = Mockito.mock(BingoCellRepository.class);
    private final BingoBoardRepository bingoBoardRepository = Mockito.mock(BingoBoardRepository.class);
    private final GameCompletionService gameCompletionService = Mockito.mock(GameCompletionService.class);
    private final BingoCellVerificationResultService verificationResultService = new BingoCellVerificationResultService(
            bingoCellRepository,
            bingoBoardRepository,
            gameCompletionService
    );

    @Test
    @DisplayName("승인 결과는 셀을 완료 처리하고 게임 완료 여부를 재평가한다")
    void applyApprovedResultCompletesCellAndEvaluatesGameCompletion() {
        // given
        BingoCell cell = cell(1000L, 100L);
        BingoBoard board = board(100L, 10L);
        when(bingoCellRepository.findById(1000L)).thenReturn(Optional.of(cell));
        when(bingoBoardRepository.findById(100L)).thenReturn(Optional.of(board));
        when(bingoCellRepository.save(cell)).thenReturn(cell);

        // when
        verificationResultService.applyResult(1000L, true, null);

        // then
        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.APPROVED);
        assertThat(cell.getRejectionReason()).isNull();
        assertThat(cell.getCompletedAt()).isNotNull();
        Mockito.verify(gameCompletionService).evaluateAndCompleteIfNeeded(10L);
    }

    @Test
    @DisplayName("거절 결과는 완료 처리하지 않고 거절 사유를 저장한다")
    void applyRejectedResultStoresReasonWithoutCompletingCell() {
        // given
        BingoCell cell = cell(1000L, 100L);
        when(bingoCellRepository.findById(1000L)).thenReturn(Optional.of(cell));
        when(bingoCellRepository.save(cell)).thenReturn(cell);

        // when
        verificationResultService.applyResult(1000L, false, "인증 이미지가 조건과 다릅니다.");

        // then
        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.REJECTED);
        assertThat(cell.getRejectionReason()).isEqualTo("인증 이미지가 조건과 다릅니다.");
        assertThat(cell.getCompletedAt()).isNull();
        Mockito.verify(gameCompletionService, Mockito.never()).evaluateAndCompleteIfNeeded(Mockito.anyLong());
    }

    private BingoCell cell(Long id, Long boardId) {
        BingoCell cell = BingoCell.create(boardId, 1L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", id);
        cell.submit(1L, "https://example.com/proof.png");
        return cell;
    }

    private BingoBoard board(Long id, Long roomId) {
        BingoBoard board = BingoBoard.create(roomId, 2);
        ReflectionTestUtils.setField(board, "id", id);
        return board;
    }
}
