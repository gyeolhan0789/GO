package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.wecandoit.bingo.controller.response.BingoBoardResponse;
import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.room.domain.GameMode;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.repository.RoomRepository;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.repository.MissionRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("빙고판 생성 서비스")
class BingoServiceTest {

    private final RoomRepository roomRepository = Mockito.mock(RoomRepository.class);
    private final BingoBoardRepository bingoBoardRepository = Mockito.mock(BingoBoardRepository.class);
    private final BingoCellRepository bingoCellRepository = Mockito.mock(BingoCellRepository.class);
    private final MissionRepository missionRepository = Mockito.mock(MissionRepository.class);
    private final BingoService bingoService = new BingoService(
            roomRepository,
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
