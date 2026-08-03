package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.wecandoit.bingo.controller.response.BingoBoardResponse;
import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionType;
import com.wecandoit.mission.repository.MissionRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("빙고판 조회 서비스")
class BingoReadServiceTest {

    @Mock
    private RoomRepository roomRepository;
    @Mock
    private RoomMemberRepository roomMemberRepository;
    @Mock
    private GameRepository gameRepository;
    @Mock
    private GameParticipantRepository gameParticipantRepository;
    @Mock
    private BingoBoardRepository bingoBoardRepository;
    @Mock
    private BingoCellRepository bingoCellRepository;
    @Mock
    private MissionRepository missionRepository;
    @InjectMocks
    private BingoReadService bingoReadService;

    @Test
    @DisplayName("활성 공유 보드는 목표 빙고 수 없이 판 크기와 목표 걸음 수를 반환한다")
    void getActiveBoardReturnsBoardSettings() {
        Room room = room(10L, 1L);
        Game game = game(20L, LocalDateTime.now());
        BingoBoard board = board(30L, game.getId());
        givenRoomContext(1L, room, game, board, List.of());

        BingoBoardResponse response = bingoReadService.getActiveBoard(1L, 10L);

        assertThat(response.boardSize()).isEqualTo(4);
        assertThat(response.targetBingoCount()).isNull();
        assertThat(response.targetStepCount()).isEqualTo(12_000);
        assertThat(response.renewalRequired()).isFalse();
    }

    @Test
    @DisplayName("7일이 지난 공유 보드는 호스트에게 갱신 가능 상태를 반환한다")
    void getActiveBoardAllowsHostRenewalAfterDeadline() {
        Room room = room(10L, 1L);
        Game game = game(20L, LocalDateTime.now().minusDays(8));
        BingoBoard board = board(30L, game.getId());
        givenRoomContext(1L, room, game, board, List.of());

        BingoBoardResponse response = bingoReadService.getActiveBoard(1L, 10L);

        assertThat(response.renewalRequired()).isTrue();
        assertThat(response.isHost()).isTrue();
        assertThat(response.canRenew()).isTrue();
    }

    @Test
    @DisplayName("7일이 지난 공유 보드의 일반 참여자는 안내만 받는다")
    void getActiveBoardDoesNotAllowMemberRenewal() {
        Room room = room(10L, 1L);
        Game game = game(20L, LocalDateTime.now().minusDays(8));
        BingoBoard board = board(30L, game.getId());
        givenRoomContext(2L, room, game, board, List.of());

        BingoBoardResponse response = bingoReadService.getActiveBoard(2L, 10L);

        assertThat(response.renewalRequired()).isTrue();
        assertThat(response.isHost()).isFalse();
        assertThat(response.canRenew()).isFalse();
    }

    @Test
    @DisplayName("목표 빙고 줄을 완성해도 빈 셀이 있으면 조기 갱신할 수 없다")
    void getActiveBoardDoesNotAllowRenewalWithIncompleteCells() {
        Room room = room(10L, 1L);
        Game game = game(20L, LocalDateTime.now().minusDays(1));
        BingoBoard board = board(30L, game.getId());
        List<BingoCell> cells = cellsWithApprovedCount(30L, 16, 4);
        givenRoomContext(1L, room, game, board, cells);

        BingoBoardResponse response = bingoReadService.getActiveBoard(1L, 10L);

        assertThat(response.completedBingoCount()).isEqualTo(1);
        assertThat(response.completed()).isFalse();
        assertThat(response.canRenew()).isFalse();
    }

    @Test
    @DisplayName("전체 셀을 완료한 공유 보드는 호스트가 조기 갱신할 수 있다")
    void getActiveBoardAllowsRenewalWhenAllCellsCompleted() {
        Room room = room(10L, 1L);
        Game game = game(20L, LocalDateTime.now().minusDays(1));
        BingoBoard board = board(30L, game.getId());
        List<BingoCell> cells = cellsWithApprovedCount(30L, 16, 16);
        givenRoomContext(1L, room, game, board, cells);

        BingoBoardResponse response = bingoReadService.getActiveBoard(1L, 10L);

        assertThat(response.completed()).isTrue();
        assertThat(response.canRenew()).isTrue();
    }

    private void givenRoomContext(
            Long memberId,
            Room room,
            Game game,
            BingoBoard board,
            List<BingoCell> cells
    ) {
        given(roomRepository.findById(room.getId())).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(room.getId(), memberId))
                .willReturn(true);
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(room.getId(), GameStatus.ACTIVE))
                .willReturn(Optional.of(game));
        given(bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(
                game.getId(),
                BingoBoardStatus.inactiveStatuses()
        )).willReturn(Optional.of(board));
        given(bingoCellRepository.findAllByBoardId(board.getId())).willReturn(cells);
        if (!cells.isEmpty()) {
            List<Long> missionIds = cells.stream().map(BingoCell::getMissionId).toList();
            given(missionRepository.findAllById(missionIds)).willReturn(missions(missionIds));
        }
    }

    private Room room(Long roomId, Long hostId) {
        Room room = Room.create(hostId, "공유 방", GameMode.COOPERATE, 1, 10_000, 3);
        ReflectionTestUtils.setField(room, "id", roomId);
        return room;
    }

    private Game game(Long gameId, LocalDateTime startedAt) {
        Game game = Game.start(10L);
        ReflectionTestUtils.setField(game, "id", gameId);
        ReflectionTestUtils.setField(game, "startedAt", startedAt);
        return game;
    }

    private BingoBoard board(Long boardId, Long gameId) {
        BingoBoard board = BingoBoard.create(gameId, 4, 12_000);
        ReflectionTestUtils.setField(board, "id", boardId);
        return board;
    }

    private List<BingoCell> cellsWithApprovedCount(Long boardId, int totalCount, int approvedCount) {
        return IntStream.range(0, totalCount)
                .mapToObj(index -> {
                    BingoCell cell = BingoCell.create(boardId, (long) index + 1, index / 4, index % 4);
                    ReflectionTestUtils.setField(cell, "id", (long) index + 1);
                    if (index < approvedCount) {
                        cell.submit(1L, "https://example.com/proof.png");
                        ReflectionTestUtils.setField(cell, "submittedAt", LocalDateTime.now().minusHours(1));
                        cell.approve();
                    }
                    return cell;
                })
                .toList();
    }

    private List<Mission> missions(List<Long> missionIds) {
        return missionIds.stream()
                .map(missionId -> {
                    Mission mission = Mission.create(
                            "https://example.com/mission.png",
                            MissionType.OBJECT,
                            "미션",
                            "설명",
                            null
                    );
                    ReflectionTestUtils.setField(mission, "id", missionId);
                    return mission;
                })
                .toList();
    }
}
