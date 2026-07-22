package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

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
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("빙고판 서비스")
class BingoServiceTest {

    private static final List<BingoBoardStatus> INACTIVE_BOARD_STATUSES =
            List.of(BingoBoardStatus.COMPLETED, BingoBoardStatus.CLOSED);

    private final RoomRepository roomRepository = Mockito.mock(RoomRepository.class);
    private final RoomMemberRepository roomMemberRepository = Mockito.mock(RoomMemberRepository.class);
    private final BingoBoardRepository bingoBoardRepository = Mockito.mock(BingoBoardRepository.class);
    private final BingoCellRepository bingoCellRepository = Mockito.mock(BingoCellRepository.class);
    private final MissionRepository missionRepository = Mockito.mock(MissionRepository.class);
    private final BingoService bingoService = new BingoService(
            roomRepository,
            roomMemberRepository,
            bingoBoardRepository,
            bingoCellRepository,
            missionRepository
    );

    @Test
    @DisplayName("방장이 진행 중인 방에서 빙고판을 생성하면 보드 크기만큼 무작위 미션이 배정된다")
    void generateBoardCreatesBoardWithRandomMissions() {
        // given
        Room room = inProgressRoom(1L, 10L, 3);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(bingoBoardRepository.existsByRoomId(10L)).thenReturn(false);
        List<Mission> missions = createMissions(9);
        when(missionRepository.findRandomMissions(9)).thenReturn(missions);
        when(bingoBoardRepository.save(Mockito.any(BingoBoard.class))).thenAnswer(invocation -> {
            BingoBoard board = invocation.getArgument(0);
            ReflectionTestUtils.setField(board, "id", 100L);
            return board;
        });
        when(bingoCellRepository.save(Mockito.any(BingoCell.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // when
        BingoBoardResponse response = bingoService.generateBoard(1L, 10L);

        // then
        assertThat(response.roomId()).isEqualTo(10L);
        assertThat(response.boardSize()).isEqualTo(3);
        assertThat(response.cells()).hasSize(9);
        assertThat(response.cells())
                .extracting(cell -> cell.mission().missionId())
                .doesNotHaveDuplicates();
        assertThat(response.cells())
                .extracting(cell -> cell.row() + "-" + cell.col())
                .containsExactlyInAnyOrder(
                        "0-0", "0-1", "0-2",
                        "1-0", "1-1", "1-2",
                        "2-0", "2-1", "2-2"
                );
    }

    @Test
    @DisplayName("존재하지 않는 게임방이면 빙고판 생성에 실패한다")
    void generateBoardRejectsMissingRoom() {
        // given
        when(roomRepository.findById(10L)).thenReturn(Optional.empty());

        // when, then
        assertErrorCode(() -> bingoService.generateBoard(1L, 10L), ErrorCode.ROOM_NOT_FOUND);
    }

    @Test
    @DisplayName("방장이 아닌 회원이 요청하면 빙고판 생성에 실패한다")
    void generateBoardRejectsNonHost() {
        // given
        Room room = inProgressRoom(1L, 10L, 3);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));

        // when, then
        assertErrorCode(() -> bingoService.generateBoard(2L, 10L), ErrorCode.BINGO_BOARD_GENERATE_FORBIDDEN);
    }

    @Test
    @DisplayName("게임이 시작되지 않은 방이면 빙고판 생성에 실패한다")
    void generateBoardRejectsRoomNotInProgress() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, 3, 3);
        ReflectionTestUtils.setField(room, "id", 10L);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));

        // when, then
        assertErrorCode(() -> bingoService.generateBoard(1L, 10L), ErrorCode.ROOM_NOT_IN_PROGRESS);
    }

    @Test
    @DisplayName("이미 빙고판이 존재하는 방이면 빙고판 생성에 실패한다")
    void generateBoardRejectsExistingBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 3);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(bingoBoardRepository.existsByRoomId(10L)).thenReturn(true);

        // when, then
        assertErrorCode(() -> bingoService.generateBoard(1L, 10L), ErrorCode.BINGO_BOARD_ALREADY_EXISTS);
    }

    @Test
    @DisplayName("미션 풀이 보드 칸 수보다 적으면 빙고판 생성에 실패한다")
    void generateBoardRejectsInsufficientMissions() {
        // given
        Room room = inProgressRoom(1L, 10L, 3);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(bingoBoardRepository.existsByRoomId(10L)).thenReturn(false);
        when(missionRepository.findRandomMissions(9)).thenReturn(createMissions(8));

        // when, then
        assertErrorCode(() -> bingoService.generateBoard(1L, 10L), ErrorCode.MISSION_POOL_INSUFFICIENT);
    }

    @Test
    @DisplayName("보드가 100% 완료되면 조회 응답에서 completed와 host의 canRenew가 true다")
    void getActiveBoardReturnsCompletedAndCanRenewForHost() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).thenReturn(true);
        BingoBoard board = activeBoard(100L, 10L, 2);
        when(bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(10L, INACTIVE_BOARD_STATUSES))
                .thenReturn(Optional.of(board));
        List<BingoCell> cells = completedCells(board.getId(), 4);
        when(bingoCellRepository.findAllByBoardId(100L)).thenReturn(cells);
        when(bingoCellRepository.existsByBoardIdAndCompletedAtIsNull(100L)).thenReturn(false);
        // 미션 목록을 셀과 다른 순서로 반환해 id 기반 매핑을 검증한다
        List<Mission> shuffledMissions = new ArrayList<>(missionsForCells(cells));
        Collections.reverse(shuffledMissions);
        when(missionRepository.findAllById(Mockito.anyIterable())).thenReturn(shuffledMissions);

        // when
        BingoBoardResponse response = bingoService.getActiveBoard(1L, 10L);

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
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).thenReturn(true);
        BingoBoard board = activeBoard(100L, 10L, 2);
        when(bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(10L, INACTIVE_BOARD_STATUSES))
                .thenReturn(Optional.of(board));
        List<BingoCell> cells = completedCells(board.getId(), 4);
        when(bingoCellRepository.findAllByBoardId(100L)).thenReturn(cells);
        when(bingoCellRepository.existsByBoardIdAndCompletedAtIsNull(100L)).thenReturn(false);
        when(missionRepository.findAllById(Mockito.anyIterable())).thenReturn(missionsForCells(cells));

        // when
        BingoBoardResponse response = bingoService.getActiveBoard(2L, 10L);

        // then
        assertThat(response.completed()).isTrue();
        assertThat(response.canRenew()).isFalse();
    }

    @Test
    @DisplayName("미완료 칸이 있으면 completed는 false다")
    void getActiveBoardReturnsNotCompleted() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).thenReturn(true);
        BingoBoard board = activeBoard(100L, 10L, 2);
        when(bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(10L, INACTIVE_BOARD_STATUSES))
                .thenReturn(Optional.of(board));
        List<BingoCell> cells = completedCells(board.getId(), 4);
        when(bingoCellRepository.findAllByBoardId(100L)).thenReturn(cells);
        when(bingoCellRepository.existsByBoardIdAndCompletedAtIsNull(100L)).thenReturn(true);
        when(missionRepository.findAllById(Mockito.anyIterable())).thenReturn(missionsForCells(cells));

        // when
        BingoBoardResponse response = bingoService.getActiveBoard(1L, 10L);

        // then
        assertThat(response.completed()).isFalse();
        assertThat(response.canRenew()).isFalse();
    }

    @Test
    @DisplayName("방 멤버가 아니면 빙고판 조회에 실패한다")
    void getActiveBoardRejectsNonMember() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 3L)).thenReturn(false);

        // when, then
        assertErrorCode(() -> bingoService.getActiveBoard(3L, 10L), ErrorCode.ROOM_MEMBER_FORBIDDEN);
    }

    @Test
    @DisplayName("활성 보드가 없으면 빙고판 조회에 실패한다")
    void getActiveBoardRejectsMissingBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).thenReturn(true);
        when(bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(10L, INACTIVE_BOARD_STATUSES))
                .thenReturn(Optional.empty());

        // when, then
        assertErrorCode(() -> bingoService.getActiveBoard(1L, 10L), ErrorCode.BINGO_BOARD_NOT_FOUND);
    }

    @Test
    @DisplayName("host가 완료된 보드를 갱신하면 기존 보드는 COMPLETED로 보존되고 새 보드가 발급된다")
    void renewBoardArchivesOldBoardAndIssuesNewOne() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        BingoBoard activeBoard = activeBoard(100L, 10L, 2);
        when(bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(10L, INACTIVE_BOARD_STATUSES))
                .thenReturn(Optional.of(activeBoard));
        when(bingoCellRepository.existsByBoardIdAndCompletedAtIsNull(100L)).thenReturn(false);
        List<Mission> missions = createMissions(4);
        when(missionRepository.findRandomMissions(4)).thenReturn(missions);
        when(bingoBoardRepository.save(Mockito.any(BingoBoard.class))).thenAnswer(invocation -> {
            BingoBoard board = invocation.getArgument(0);
            if (board.getId() == null) {
                ReflectionTestUtils.setField(board, "id", 200L);
            }
            return board;
        });
        when(bingoCellRepository.save(Mockito.any(BingoCell.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // when
        BingoBoardResponse response = bingoService.renewBoard(1L, 10L);

        // then
        assertThat(activeBoard.getStatus()).isEqualTo(BingoBoardStatus.COMPLETED);
        assertThat(activeBoard.getCompletedAt()).isNotNull();
        assertThat(response.roomId()).isEqualTo(10L);
        assertThat(response.status()).isEqualTo(BingoBoardStatus.CREATED);
        assertThat(response.cells()).hasSize(4);
        Mockito.verify(bingoBoardRepository).save(activeBoard);
    }

    @Test
    @DisplayName("보드가 100% 완료되지 않았으면 조기 갱신에 실패한다")
    void renewBoardRejectsIncompleteBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        BingoBoard activeBoard = activeBoard(100L, 10L, 2);
        when(bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(10L, INACTIVE_BOARD_STATUSES))
                .thenReturn(Optional.of(activeBoard));
        when(bingoCellRepository.existsByBoardIdAndCompletedAtIsNull(100L)).thenReturn(true);

        // when, then
        assertErrorCode(() -> bingoService.renewBoard(1L, 10L), ErrorCode.BINGO_BOARD_NOT_COMPLETED);
        assertThat(activeBoard.getStatus()).isEqualTo(BingoBoardStatus.IN_PROGRESS);
    }

    @Test
    @DisplayName("host가 아니면 조기 갱신에 실패한다")
    void renewBoardRejectsNonHost() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        BingoBoard activeBoard = activeBoard(100L, 10L, 2);
        when(bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(10L, INACTIVE_BOARD_STATUSES))
                .thenReturn(Optional.of(activeBoard));

        // when, then
        assertErrorCode(() -> bingoService.renewBoard(2L, 10L), ErrorCode.BINGO_BOARD_RENEWAL_FORBIDDEN);
    }

    @Test
    @DisplayName("방이 진행 중이 아니면 조기 갱신에 실패한다")
    void renewBoardRejectsRoomNotInProgress() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, 3, 2);
        ReflectionTestUtils.setField(room, "id", 10L);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));

        // when, then
        assertErrorCode(() -> bingoService.renewBoard(1L, 10L), ErrorCode.ROOM_NOT_IN_PROGRESS);
    }

    @Test
    @DisplayName("활성 보드가 없으면 조기 갱신에 실패한다")
    void renewBoardRejectsMissingBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(10L, INACTIVE_BOARD_STATUSES))
                .thenReturn(Optional.empty());

        // when, then
        assertErrorCode(() -> bingoService.renewBoard(1L, 10L), ErrorCode.BINGO_BOARD_NOT_FOUND);
    }

    @Test
    @DisplayName("미션 풀이 부족하면 조기 갱신에 실패하고 기존 보드는 그대로 유지된다")
    void renewBoardRejectsInsufficientMissionsAndKeepsOldBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        BingoBoard activeBoard = activeBoard(100L, 10L, 2);
        when(bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(10L, INACTIVE_BOARD_STATUSES))
                .thenReturn(Optional.of(activeBoard));
        when(bingoCellRepository.existsByBoardIdAndCompletedAtIsNull(100L)).thenReturn(false);
        when(missionRepository.findRandomMissions(4)).thenReturn(createMissions(3));

        // when, then
        assertErrorCode(() -> bingoService.renewBoard(1L, 10L), ErrorCode.MISSION_POOL_INSUFFICIENT);
        assertThat(activeBoard.getStatus()).isEqualTo(BingoBoardStatus.IN_PROGRESS);
        Mockito.verify(bingoBoardRepository, Mockito.never()).save(activeBoard);
    }

    private BingoBoard activeBoard(Long boardId, Long roomId, int boardSize) {
        BingoBoard board = BingoBoard.create(roomId, boardSize);
        ReflectionTestUtils.setField(board, "id", boardId);
        ReflectionTestUtils.setField(board, "status", BingoBoardStatus.IN_PROGRESS);
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
        Room room = Room.create(hostId, GameMode.SINGLE, 3, boardSize);
        ReflectionTestUtils.setField(room, "id", roomId);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        return room;
    }

    private List<Mission> createMissions(int count) {
        List<Mission> missions = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            Mission mission = Mission.create("https://example.com/mission.png", "OBJECT", "미션" + i, "설명", null);
            ReflectionTestUtils.setField(mission, "id", (long) (i + 1));
            missions.add(mission);
        }
        return missions;
    }

    private void assertErrorCode(Runnable action, ErrorCode errorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(errorCode);
    }
}
