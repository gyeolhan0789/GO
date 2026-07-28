package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import com.wecandoit.bingo.controller.response.BingoBoardResponse;
import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.repository.MissionRepository;
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
    private GameRepository gameRepository;
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
        Room room = inProgressCooperateRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(10L, GameStatus.IN_PROGRESS))
                .willReturn(Optional.of(activeGame(200L, 10L)));
        BingoBoard board = activeBoard(100L, 200L, 2);
        given(bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        List<BingoCell> cells = cellsWithApprovedCount(board.getId(), 4, 4);
        given(bingoCellRepository.findAllByBoardId(100L)).willReturn(cells);
        // 미션 목록을 셀과 다른 순서로 반환해 id 기반 매핑을 검증한다
        List<Mission> shuffledMissions = new ArrayList<>(missionsForCells(cells));
        Collections.reverse(shuffledMissions);
        given(missionRepository.findAllById(Mockito.anyIterable())).willReturn(shuffledMissions);

        // when
        BingoBoardResponse response = bingoReadService.getActiveBoard(1L, 10L);

        // then
        assertThat(response.completed()).isTrue();
        assertThat(response.canRenew()).isTrue();
        assertThat(response.targetBingoCount()).isNull();
        assertThat(response.completedBingoCount()).isEqualTo(6);
        assertThat(response.totalCellCount()).isEqualTo(4);
        assertThat(response.approvedCellCount()).isEqualTo(4);
        assertThat(response.cells()).hasSize(4);
        for (int i = 0; i < cells.size(); i++) {
            assertThat(response.cells().get(i).cellId()).isEqualTo(cells.get(i).getId());
            assertThat(response.cells().get(i).mission().missionId()).isEqualTo(cells.get(i).getMissionId());
            assertThat(response.cells().get(i).verificationStatus())
                    .isEqualTo(BingoCellVerificationStatus.APPROVED);
            assertThat(response.cells().get(i).submittedByMemberId())
                    .isEqualTo(cells.get(i).getMemberId());
        }
    }

    @Test
    @DisplayName("보드가 완료되어도 host가 아니면 canRenew는 false다")
    void getActiveBoardCanRenewFalseForNonHost() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(true);
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(10L, GameStatus.IN_PROGRESS))
                .willReturn(Optional.of(activeGame(200L, 10L)));
        BingoBoard board = activeBoard(100L, 200L, 2);
        given(bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        List<BingoCell> cells = cellsWithApprovedCount(board.getId(), 4, 4);
        given(bingoCellRepository.findAllByBoardId(100L)).willReturn(cells);
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
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(10L, GameStatus.IN_PROGRESS))
                .willReturn(Optional.of(activeGame(200L, 10L)));
        BingoBoard board = activeBoard(100L, 200L, 2);
        given(bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        List<BingoCell> cells = cellsWithApprovedCount(board.getId(), 4, 3);
        given(bingoCellRepository.findAllByBoardId(100L)).willReturn(cells);
        given(missionRepository.findAllById(Mockito.anyIterable())).willReturn(missionsForCells(cells));

        // when
        BingoBoardResponse response = bingoReadService.getActiveBoard(1L, 10L);

        // then
        assertThat(response.completed()).isFalse();
        assertThat(response.canRenew()).isFalse();
        assertThat(response.completedBingoCount()).isEqualTo(3);
        assertThat(response.approvedCellCount()).isEqualTo(3);
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
    @DisplayName("존재하지 않는 방의 빙고판 조회에 실패한다")
    void getActiveBoardRejectsMissingRoom() {
        // given
        given(roomRepository.findById(10L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(() -> bingoReadService.getActiveBoard(1L, 10L), ErrorCode.ROOM_NOT_FOUND);
    }

    @Test
    @DisplayName("활성 보드가 없으면 빙고판 조회에 실패한다")
    void getActiveBoardRejectsMissingBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(10L, GameStatus.IN_PROGRESS))
                .willReturn(Optional.of(activeGame(200L, 10L)));
        given(bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.empty());

        // when & then
        assertErrorCode(() -> bingoReadService.getActiveBoard(1L, 10L), ErrorCode.BINGO_BOARD_NOT_FOUND);
    }

    @Test
    @DisplayName("대결 참가자는 본인 RoomMember에 연결된 개인 빙고판을 조회한다")
    void getActiveBoardReturnsBattleBoardOwnedByRoomMember() {
        // given
        Room room = Room.create(1L, GameMode.BATTLE, 3, 2);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        RoomMember roomMember = RoomMember.create(10L, 1L);
        ReflectionTestUtils.setField(roomMember, "id", 101L);
        BingoBoard board = BingoBoard.createForBattle(200L, roomMember, 2);
        ReflectionTestUtils.setField(board, "id", 201L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(10L, GameStatus.IN_PROGRESS))
                .willReturn(Optional.of(activeGame(200L, 10L)));
        given(roomMemberRepository.findByRoomIdAndMemberId(10L, 1L)).willReturn(Optional.of(roomMember));
        given(bingoBoardRepository.findFirstByGameIdAndRoomMemberIdAndStatusNotInOrderByIdDesc(
                200L,
                101L,
                INACTIVE_BOARD_STATUSES
        )).willReturn(Optional.of(board));
        List<BingoCell> cells = cellsWithApprovedCount(201L, 4, 4);
        given(bingoCellRepository.findAllByBoardId(201L)).willReturn(cells);
        given(missionRepository.findAllById(Mockito.anyIterable())).willReturn(missionsForCells(cells));

        // when
        BingoBoardResponse response = bingoReadService.getActiveBoard(1L, 10L);

        // then
        assertThat(response.bingoBoardId()).isEqualTo(201L);
        assertThat(response.canRenew()).isFalse();
    }

    private BingoBoard activeBoard(Long boardId, Long gameId, int boardSize) {
        BingoBoard board = BingoBoard.create(gameId, boardSize);
        ReflectionTestUtils.setField(board, "id", boardId);
        return board;
    }

    private Game activeGame(Long gameId, Long roomId) {
        Game game = Game.start(roomId);
        ReflectionTestUtils.setField(game, "id", gameId);
        return game;
    }

    private List<BingoCell> cellsWithApprovedCount(Long boardId, int totalCount, int approvedCount) {
        List<BingoCell> cells = new ArrayList<>();
        for (int i = 0; i < totalCount; i++) {
            BingoCell cell = BingoCell.create(boardId, (long) (i + 1), i / 2, i % 2);
            ReflectionTestUtils.setField(cell, "id", (long) (i + 1));
            if (i < approvedCount) {
                cell.submit((long) (i % 2 + 1), "https://example.com/proof-" + i + ".png");
                cell.approve();
            }
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
        Room room = Room.create(hostId, GameMode.SINGLE, null, boardSize);
        ReflectionTestUtils.setField(room, "id", roomId);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        return room;
    }

    private Room inProgressCooperateRoom(Long hostId, Long roomId, int boardSize) {
        Room room = Room.create(hostId, GameMode.COOPERATE, null, boardSize);
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
