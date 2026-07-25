package com.wecandoit.game.result.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.service.BingoService;
import com.wecandoit.cash.repository.CashHistoryRepository;
import com.wecandoit.game.result.domain.GameResult;
import com.wecandoit.game.result.repository.GameResultRepository;
import com.wecandoit.game.room.domain.GameMode;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.domain.RoomMember;
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("게임 완료 오케스트레이션 서비스")
class GameCompletionServiceTest {

    @Mock
    private RoomRepository roomRepository;
    @Mock
    private RoomMemberRepository roomMemberRepository;
    @Mock
    private GameResultRepository gameResultRepository;
    @Mock
    private BingoService bingoService;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private CashHistoryRepository cashHistoryRepository;
    private GameCompletionService gameCompletionService;

    @BeforeEach
    void setUp() {
        gameCompletionService = new GameCompletionService(
                roomRepository,
                roomMemberRepository,
                gameResultRepository,
                bingoService,
                memberRepository,
                cashHistoryRepository
        );
    }

    @Test
    @DisplayName("완성된 줄 수가 targetBingoCount 미만이면 방 상태와 결과를 변경하지 않는다")
    void doesNotCompleteWhenTargetNotReached() {
        // given
        Room room = inProgressRoom(1L, 10L, 3, 2);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        // row0 완성(1줄)만 존재 -> targetBingoCount=3에 미달
        List<BingoCell> cells = List.of(
                completedCell(100L, 0, 0, 1L),
                completedCell(100L, 0, 1, 1L),
                incompleteCell(100L, 1, 0),
                incompleteCell(100L, 1, 1)
        );
        given(bingoService.getActiveBoardCells(10L)).willReturn(cells);

        // when
        gameCompletionService.evaluateAndCompleteIfNeeded(10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.IN_PROGRESS);
        then(gameResultRepository).should(Mockito.never()).save(Mockito.any());
        then(roomMemberRepository).should(Mockito.never()).findAllByRoomIdOrderByJoinedAtAsc(Mockito.anyLong());
    }

    @Test
    @DisplayName("완성된 줄 수가 targetBingoCount 이상이면 방을 COMPLETED로 전환하고 게임 결과를 저장한다")
    void completesRoomAndSavesResultWhenTargetReached() {
        // given
        Room room = inProgressRoom(1L, 10L, 2, 2);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        // row0(1줄) + col0(1줄) + anti-diagonal(1줄) = 3줄 완성 -> targetBingoCount=2 달성
        List<BingoCell> cells = List.of(
                completedCell(100L, 0, 0, 1L),
                completedCell(100L, 0, 1, 1L),
                completedCell(100L, 1, 0, 1L),
                incompleteCell(100L, 1, 1)
        );
        given(bingoService.getActiveBoardCells(10L)).willReturn(cells);
        RoomMember member = roomMember(1L, 10L, 1L);
        given(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L)).willReturn(List.of(member));
        Member rewardMember = member(1L, 0L);
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(rewardMember));

        // when
        gameCompletionService.evaluateAndCompleteIfNeeded(10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.COMPLETED);
        assertThat(member.getCompletedMissionCount()).isEqualTo(3);
        assertThat(rewardMember.getCash()).isEqualTo(500L);
        then(cashHistoryRepository).should().save(Mockito.argThat(history ->
                history.getMemberId().equals(1L)
                        && history.getReferenceId().equals(10L)
                        && history.getAmount() == 500L
        ));

        then(gameResultRepository).should().save(Mockito.argThat((GameResult result) ->
                result.getRoomId().equals(10L)
                        && result.isResult()
                        && result.getBingoCount() == 3
                        && result.getCompletedMissionCount() == 3
                        && result.getRewardCash() == 500L
        ));
    }

    @Test
    @DisplayName("이미 COMPLETED인 방에 대해 두 번 호출해도 게임 결과는 한 번만 저장된다")
    void isIdempotentForAlreadyCompletedRoom() {
        // given
        Room room = inProgressRoom(1L, 10L, 2, 2);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        List<BingoCell> cells = List.of(
                completedCell(100L, 0, 0, 1L),
                completedCell(100L, 0, 1, 1L),
                completedCell(100L, 1, 0, 1L),
                incompleteCell(100L, 1, 1)
        );
        given(bingoService.getActiveBoardCells(10L)).willReturn(cells);
        RoomMember member = roomMember(1L, 10L, 1L);
        given(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L)).willReturn(List.of(member));
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(member(1L, 0L)));

        // when: 첫 호출로 완료 처리, 두 번째 호출은 멱등성 가드에 의해 조기 반환
        gameCompletionService.evaluateAndCompleteIfNeeded(10L);
        gameCompletionService.evaluateAndCompleteIfNeeded(10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.COMPLETED);
        then(gameResultRepository).should(Mockito.times(1)).save(Mockito.any());
        then(cashHistoryRepository).should(Mockito.times(1)).save(Mockito.any());
    }

    @Test
    @DisplayName("서로 다른 칸을 완료한 멤버가 여럿이면 각자의 완료 칸 수로 갱신되고 합계는 completedMissionCount와 일치한다")
    void updatesEachMemberWithOwnCompletedCellCountAndSumMatchesTotal() {
        // given
        Room room = inProgressRoom(1L, 10L, 2, 2);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        // memberA(10L)가 row0(2칸), memberB(20L)가 (1,0) 1칸 완료 -> row0 + col0 = 2줄
        List<BingoCell> cells = List.of(
                completedCell(100L, 0, 0, 10L),
                completedCell(100L, 0, 1, 10L),
                completedCell(100L, 1, 0, 20L),
                incompleteCell(100L, 1, 1)
        );
        given(bingoService.getActiveBoardCells(10L)).willReturn(cells);
        RoomMember memberA = roomMember(1L, 10L, 10L);
        RoomMember memberB = roomMember(2L, 10L, 20L);
        given(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L)).willReturn(List.of(memberA, memberB));
        given(memberRepository.findByIdForUpdate(10L)).willReturn(Optional.of(member(10L, 0L)));
        given(memberRepository.findByIdForUpdate(20L)).willReturn(Optional.of(member(20L, 0L)));

        // when
        gameCompletionService.evaluateAndCompleteIfNeeded(10L);

        // then
        assertThat(memberA.getCompletedMissionCount()).isEqualTo(2);
        assertThat(memberB.getCompletedMissionCount()).isEqualTo(1);
        int sum = memberA.getCompletedMissionCount() + memberB.getCompletedMissionCount();

        then(gameResultRepository).should().save(Mockito.argThat((GameResult result) ->
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
        Room room = Room.create(hostId, GameMode.SINGLE, targetBingoCount, boardSize, null);
        ReflectionTestUtils.setField(room, "id", roomId);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        return room;
    }

    private Member member(Long id, long cash) {
        Member member = Member.builder()
                .email("member" + id + "@example.com")
                .nickname("member" + id)
                .cash(cash)
                .build();
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }
}
