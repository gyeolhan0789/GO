package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.game.result.service.GameCompletionService;
import com.wecandoit.game.room.domain.GameMode;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.repository.RoomRepository;
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
        BingoBoard board = board(100L, 10L);
        given(bingoCellRepository.findById(1000L)).willReturn(Optional.of(cell));
        given(bingoBoardRepository.findById(100L)).willReturn(Optional.of(board));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(inProgressRoom(10L)));
        given(bingoCellRepository.save(cell)).willReturn(cell);

        // when
        verificationResultService.applyResult(1000L, true, null);

        // then
        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.APPROVED);
        assertThat(cell.getRejectionReason()).isNull();
        assertThat(cell.getCompletedAt()).isNotNull();
        then(gameCompletionService).should().evaluateAndCompleteIfNeeded(10L);
    }

    @Test
    @DisplayName("거절 결과는 완료 처리하지 않고 거절 사유를 저장한다")
    void applyRejectedResultStoresReasonWithoutCompletingCell() {
        // given
        BingoCell cell = cell(1000L, 100L);
        BingoBoard board = board(100L, 10L);
        given(bingoCellRepository.findById(1000L)).willReturn(Optional.of(cell));
        given(bingoBoardRepository.findById(100L)).willReturn(Optional.of(board));
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
        BingoBoard board = board(100L, 10L);
        Room closedRoom = inProgressRoom(10L);
        closedRoom.close();
        given(bingoCellRepository.findById(1000L)).willReturn(Optional.of(cell));
        given(bingoBoardRepository.findById(100L)).willReturn(Optional.of(board));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(closedRoom));

        // when
        verificationResultService.applyResult(1000L, true, null);

        // then
        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.PENDING);
        then(bingoCellRepository).should(Mockito.never()).save(cell);
        then(gameCompletionService).shouldHaveNoInteractions();
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

    private Room inProgressRoom(Long roomId) {
        Room room = Room.create(1L, GameMode.SINGLE, 3, 3, null);
        ReflectionTestUtils.setField(room, "id", roomId);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        return room;
    }
}
