package com.wecandoit.game.result.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.service.BingoService;
import com.wecandoit.game.result.domain.GameResult;
import com.wecandoit.game.result.repository.GameResultRepository;
import com.wecandoit.game.room.domain.GameMode;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.domain.RoomMember;
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("게임 완료 오케스트레이션 서비스")
class GameCompletionServiceTest {

    private final RoomRepository roomRepository = Mockito.mock(RoomRepository.class);
    private final RoomMemberRepository roomMemberRepository = Mockito.mock(RoomMemberRepository.class);
    private final GameResultRepository gameResultRepository = Mockito.mock(GameResultRepository.class);
    private final BingoService bingoService = Mockito.mock(BingoService.class);
    private final GameCompletionService gameCompletionService = new GameCompletionService(
            roomRepository,
            roomMemberRepository,
            gameResultRepository,
            bingoService
    );

    @Test
    @DisplayName("완성된 줄 수가 targetBingoCount 미만이면 방 상태와 결과를 변경하지 않는다")
    void doesNotCompleteWhenTargetNotReached() {
        // given
        Room room = inProgressRoom(1L, 10L, 3, 2);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        // row0 완성(1줄)만 존재 -> targetBingoCount=3에 미달
        List<BingoCell> cells = List.of(
                completedCell(100L, 0, 0, 1L),
                completedCell(100L, 0, 1, 1L),
                incompleteCell(100L, 1, 0),
                incompleteCell(100L, 1, 1)
        );
        when(bingoService.getActiveBoardCells(10L)).thenReturn(cells);

        // when
        gameCompletionService.evaluateAndCompleteIfNeeded(10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.IN_PROGRESS);
        Mockito.verify(gameResultRepository, Mockito.never()).save(Mockito.any());
        Mockito.verify(roomMemberRepository, Mockito.never()).findAllByRoomIdOrderByJoinedAtAsc(Mockito.anyLong());
    }

    @Test
    @DisplayName("완성된 줄 수가 targetBingoCount 이상이면 방을 COMPLETED로 전환하고 게임 결과를 저장한다")
    void completesRoomAndSavesResultWhenTargetReached() {
        // given
        Room room = inProgressRoom(1L, 10L, 2, 2);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        // row0(1줄) + col0(1줄) + anti-diagonal(1줄) = 3줄 완성 -> targetBingoCount=2 달성
        List<BingoCell> cells = List.of(
                completedCell(100L, 0, 0, 1L),
                completedCell(100L, 0, 1, 1L),
                completedCell(100L, 1, 0, 1L),
                incompleteCell(100L, 1, 1)
        );
        when(bingoService.getActiveBoardCells(10L)).thenReturn(cells);
        RoomMember member = roomMember(1L, 10L, 1L);
        when(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L)).thenReturn(List.of(member));

        // when
        gameCompletionService.evaluateAndCompleteIfNeeded(10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.COMPLETED);
        assertThat(member.getCompletedMissionCount()).isEqualTo(3);

        Mockito.verify(gameResultRepository).save(Mockito.argThat((GameResult result) ->
                result.getRoomId().equals(10L)
                        && result.isResult()
                        && result.getBingoCount() == 3
                        && result.getCompletedMissionCount() == 3
                        && result.getRewardCash() == 0L
        ));
    }

    @Test
    @DisplayName("이미 COMPLETED인 방에 대해 두 번 호출해도 게임 결과는 한 번만 저장된다")
    void isIdempotentForAlreadyCompletedRoom() {
        // given
        Room room = inProgressRoom(1L, 10L, 2, 2);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        List<BingoCell> cells = List.of(
                completedCell(100L, 0, 0, 1L),
                completedCell(100L, 0, 1, 1L),
                completedCell(100L, 1, 0, 1L),
                incompleteCell(100L, 1, 1)
        );
        when(bingoService.getActiveBoardCells(10L)).thenReturn(cells);
        RoomMember member = roomMember(1L, 10L, 1L);
        when(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L)).thenReturn(List.of(member));

        // when: 첫 호출로 완료 처리, 두 번째 호출은 멱등성 가드에 의해 조기 반환
        gameCompletionService.evaluateAndCompleteIfNeeded(10L);
        gameCompletionService.evaluateAndCompleteIfNeeded(10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.COMPLETED);
        Mockito.verify(gameResultRepository, Mockito.times(1)).save(Mockito.any());
    }

    @Test
    @DisplayName("서로 다른 칸을 완료한 멤버가 여럿이면 각자의 완료 칸 수로 갱신되고 합계는 completedMissionCount와 일치한다")
    void updatesEachMemberWithOwnCompletedCellCountAndSumMatchesTotal() {
        // given
        Room room = inProgressRoom(1L, 10L, 2, 2);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        // memberA(10L)가 row0(2칸), memberB(20L)가 (1,0) 1칸 완료 -> row0 + col0 = 2줄
        List<BingoCell> cells = List.of(
                completedCell(100L, 0, 0, 10L),
                completedCell(100L, 0, 1, 10L),
                completedCell(100L, 1, 0, 20L),
                incompleteCell(100L, 1, 1)
        );
        when(bingoService.getActiveBoardCells(10L)).thenReturn(cells);
        RoomMember memberA = roomMember(1L, 10L, 10L);
        RoomMember memberB = roomMember(2L, 10L, 20L);
        when(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L)).thenReturn(List.of(memberA, memberB));

        // when
        gameCompletionService.evaluateAndCompleteIfNeeded(10L);

        // then
        assertThat(memberA.getCompletedMissionCount()).isEqualTo(2);
        assertThat(memberB.getCompletedMissionCount()).isEqualTo(1);
        int sum = memberA.getCompletedMissionCount() + memberB.getCompletedMissionCount();

        Mockito.verify(gameResultRepository).save(Mockito.argThat((GameResult result) ->
                result.getCompletedMissionCount() == sum && result.getCompletedMissionCount() == 3
        ));
    }

    private BingoCell completedCell(Long boardId, int row, int col, Long memberId) {
        BingoCell cell = BingoCell.create(boardId, 1L, row, col);
        ReflectionTestUtils.setField(cell, "memberId", memberId);
        ReflectionTestUtils.setField(cell, "completedAt", LocalDateTime.now());
        return cell;
    }

    private BingoCell incompleteCell(Long boardId, int row, int col) {
        return BingoCell.create(boardId, 1L, row, col);
    }

    private RoomMember roomMember(Long id, Long roomId, Long memberId) {
        RoomMember member = RoomMember.create(roomId, memberId);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }

    private Room inProgressRoom(Long hostId, Long roomId, int targetBingoCount, int boardSize) {
        Room room = Room.create(hostId, GameMode.SINGLE, targetBingoCount, boardSize);
        ReflectionTestUtils.setField(room, "id", roomId);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        return room;
    }
}
