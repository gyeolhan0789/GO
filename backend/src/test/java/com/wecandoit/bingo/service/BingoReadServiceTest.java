package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import com.wecandoit.bingo.controller.response.BingoBoardResponse;
import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.room.domain.GameMode;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.repository.MissionRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("빙고판 조회 서비스")
@ExtendWith(MockitoExtension.class)
class BingoReadServiceTest {

    private static final List<BingoBoardStatus> INACTIVE_BOARD_STATUSES =
            List.of(BingoBoardStatus.COMPLETED, BingoBoardStatus.EXPIRED);

    @Mock
    private RoomRepository roomRepository;
    @Mock
    private RoomMemberRepository roomMemberRepository;
    @Mock
    private BingoBoardRepository bingoBoardRepository;
    @Mock
    private BingoCellRepository bingoCellRepository;
    @Mock
    private MissionRepository missionRepository;
    @InjectMocks
    private BingoReadService bingoReadService;

    @Test
    @DisplayName("보드가 100% 완료되면 조회 응답에서 completed와 host의 canRenew가 true다")
    void getActiveBoardReturnsCompletedAndCanRenewForHost() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        BingoBoard board = activeBoard(100L, 10L, 2);
        given(bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(10L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        List<BingoCell> cells = completedCells(board.getId(), 4);
        given(bingoCellRepository.findAllByBoardId(100L)).willReturn(cells);
        given(bingoCellRepository.existsByBoardIdAndCompletedAtIsNull(100L)).willReturn(false);
        // 미션 목록을 셀과 다른 순서로 반환해 id 기반 매핑을 검증한다
        List<Mission> shuffledMissions = new ArrayList<>(missionsForCells(cells));
        Collections.reverse(shuffledMissions);
        given(missionRepository.findAllById(Mockito.anyIterable())).willReturn(shuffledMissions);

        // when
        BingoBoardResponse response = bingoReadService.getActiveBoard(1L, 10L);

        // then
        assertThat(response.completed()).isTrue();
        assertThat(response.canRenew()).isTrue();
        assertThat(response.cells()).hasSize(4);
        for (int i = 0; i < cells.size(); i++) {
            assertThat(response.cells().get(i).mission().missionId()).isEqualTo(cells.get(i).getMissionId());
        }
    }

    @Test
    @DisplayName("보드가 완료되어도 host가 아니면 canRenew는 false다")
    void getActiveBoardCanRenewFalseForNonHost() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(true);
        BingoBoard board = activeBoard(100L, 10L, 2);
        given(bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(10L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        List<BingoCell> cells = completedCells(board.getId(), 4);
        given(bingoCellRepository.findAllByBoardId(100L)).willReturn(cells);
        given(bingoCellRepository.existsByBoardIdAndCompletedAtIsNull(100L)).willReturn(false);
        given(missionRepository.findAllById(Mockito.anyIterable())).willReturn(missionsForCells(cells));

        // when
        BingoBoardResponse response = bingoReadService.getActiveBoard(2L, 10L);

        // then
        assertThat(response.completed()).isTrue();
        assertThat(response.canRenew()).isFalse();
    }

    @Test
    @DisplayName("미완료 칸이 있으면 completed는 false다")
    void getActiveBoardReturnsNotCompleted() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        BingoBoard board = activeBoard(100L, 10L, 2);
        given(bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(10L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        List<BingoCell> cells = completedCells(board.getId(), 4);
        given(bingoCellRepository.findAllByBoardId(100L)).willReturn(cells);
        given(bingoCellRepository.existsByBoardIdAndCompletedAtIsNull(100L)).willReturn(true);
        given(missionRepository.findAllById(Mockito.anyIterable())).willReturn(missionsForCells(cells));

        // when
        BingoBoardResponse response = bingoReadService.getActiveBoard(1L, 10L);

        // then
        assertThat(response.completed()).isFalse();
        assertThat(response.canRenew()).isFalse();
    }

    @Test
    @DisplayName("방 멤버가 아니면 빙고판 조회에 실패한다")
    void getActiveBoardRejectsNonMember() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 3L)).willReturn(false);

        // when & then
        assertErrorCode(() -> bingoReadService.getActiveBoard(3L, 10L), ErrorCode.ROOM_MEMBER_FORBIDDEN);
    }

    @Test
    @DisplayName("활성 보드가 없으면 빙고판 조회에 실패한다")
    void getActiveBoardRejectsMissingBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(10L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.empty());

        // when & then
        assertErrorCode(() -> bingoReadService.getActiveBoard(1L, 10L), ErrorCode.BINGO_BOARD_NOT_FOUND);
    }

    private BingoBoard activeBoard(Long boardId, Long roomId, int boardSize) {
        BingoBoard board = BingoBoard.create(roomId, boardSize);
        ReflectionTestUtils.setField(board, "id", boardId);
        return board;
    }

    private List<BingoCell> completedCells(Long boardId, int count) {
        List<BingoCell> cells = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            BingoCell cell = BingoCell.create(boardId, (long) (i + 1), i / 2, i % 2);
            ReflectionTestUtils.setField(cell, "id", (long) (i + 1));
            ReflectionTestUtils.setField(cell, "completedAt", LocalDateTime.now());
            cells.add(cell);
        }
        return cells;
    }

    private List<Mission> missionsForCells(List<BingoCell> cells) {
        List<Mission> missions = new ArrayList<>();
        for (BingoCell cell : cells) {
            Mission mission = Mission.create("https://example.com/mission.png", "OBJECT", "미션" + cell.getMissionId(), "설명", null);
            ReflectionTestUtils.setField(mission, "id", cell.getMissionId());
            missions.add(mission);
        }
        return missions;
    }

    private Room inProgressRoom(Long hostId, Long roomId, int boardSize) {
        Room room = Room.create(hostId, GameMode.SINGLE, 3, boardSize, null);
        ReflectionTestUtils.setField(room, "id", roomId);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        return room;
    }

    private void assertErrorCode(Runnable action, ErrorCode errorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(errorCode);
    }
}
