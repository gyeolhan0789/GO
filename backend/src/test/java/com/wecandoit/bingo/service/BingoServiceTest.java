package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.bingo.controller.response.BingoBoardResponse;
import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
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
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("빙고판 서비스")
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class BingoServiceTest {

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
    private BingoService bingoService;

    @Test
    @DisplayName("방장이 진행 중인 방에서 빙고판을 생성하면 보드 크기만큼 무작위 미션이 배정된다")
    void generateBoardCreatesBoardWithRandomMissions() {
        // given
        Room room = inProgressRoom(1L, 10L, 3);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(bingoBoardRepository.existsByRoomId(10L)).willReturn(false);
        List<Mission> missions = createMissions(9);
        given(missionRepository.findRandomMissions(9)).willReturn(missions);
        given(bingoBoardRepository.save(Mockito.any(BingoBoard.class))).willAnswer(invocation -> {
            BingoBoard board = invocation.getArgument(0);
            ReflectionTestUtils.setField(board, "id", 100L);
            return board;
        });
        given(bingoCellRepository.save(Mockito.any(BingoCell.class))).willAnswer(invocation -> invocation.getArgument(0));

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
        given(roomRepository.findById(10L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(() -> bingoService.generateBoard(1L, 10L), ErrorCode.ROOM_NOT_FOUND);
    }

    @Test
    @DisplayName("방장이 아닌 회원이 요청하면 빙고판 생성에 실패한다")
    void generateBoardRejectsNonHost() {
        // given
        Room room = inProgressRoom(1L, 10L, 3);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));

        // when & then
        assertErrorCode(() -> bingoService.generateBoard(2L, 10L), ErrorCode.BINGO_BOARD_GENERATE_FORBIDDEN);
    }

    @Test
    @DisplayName("게임이 시작되지 않은 방이면 빙고판 생성에 실패한다")
    void generateBoardRejectsRoomNotInProgress() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, 3, 3);
        ReflectionTestUtils.setField(room, "id", 10L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));

        // when & then
        assertErrorCode(() -> bingoService.generateBoard(1L, 10L), ErrorCode.ROOM_NOT_IN_PROGRESS);
    }

    @Test
    @DisplayName("이미 빙고판이 존재하는 방이면 빙고판 생성에 실패한다")
    void generateBoardRejectsExistingBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 3);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(bingoBoardRepository.existsByRoomId(10L)).willReturn(true);

        // when & then
        assertErrorCode(() -> bingoService.generateBoard(1L, 10L), ErrorCode.BINGO_BOARD_ALREADY_EXISTS);
    }

    @Test
    @DisplayName("미션 풀이 보드 칸 수보다 적으면 빙고판 생성에 실패한다")
    void generateBoardRejectsInsufficientMissions() {
        // given
        Room room = inProgressRoom(1L, 10L, 3);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(bingoBoardRepository.existsByRoomId(10L)).willReturn(false);
        given(missionRepository.findRandomMissions(9)).willReturn(createMissions(8));

        // when & then
        assertErrorCode(() -> bingoService.generateBoard(1L, 10L), ErrorCode.MISSION_POOL_INSUFFICIENT);
    }

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
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 3L)).willReturn(false);

        // when & then
        assertErrorCode(() -> bingoService.getActiveBoard(3L, 10L), ErrorCode.ROOM_MEMBER_FORBIDDEN);
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
        assertErrorCode(() -> bingoService.getActiveBoard(1L, 10L), ErrorCode.BINGO_BOARD_NOT_FOUND);
    }

    @Test
    @DisplayName("방 멤버가 칸을 제출하면 검증 대기 상태가 되고 완료 처리되지 않는다")
    void submitCellSetsPendingStatusWithoutCompleting() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(true);
        BingoBoard board = activeBoard(100L, 10L, 2);
        given(bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(10L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        BingoCell cell = BingoCell.create(100L, 1L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", 1000L);
        given(bingoCellRepository.findById(1000L)).willReturn(Optional.of(cell));
        given(bingoCellRepository.save(Mockito.any(BingoCell.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        bingoService.submitCell(2L, 10L, 1000L, "https://example.com/proof.png");

        // then
        assertThat(cell.getMemberId()).isEqualTo(2L);
        assertThat(cell.getSubmitUrl()).isEqualTo("https://example.com/proof.png");
        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.PENDING);
        assertThat(cell.getRejectionReason()).isNull();
        assertThat(cell.getCompletedAt()).isNull();
        then(bingoCellRepository).should().save(cell);
    }

    @Test
    @DisplayName("거절된 칸을 재제출하면 검증 대기 상태로 돌아가고 거절 사유가 초기화된다")
    void submitCellResetsRejectedCellToPending() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(true);
        BingoBoard board = activeBoard(100L, 10L, 2);
        given(bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(10L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        BingoCell cell = BingoCell.create(100L, 1L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", 1000L);
        cell.reject("인증 이미지가 조건과 다릅니다.");
        given(bingoCellRepository.findById(1000L)).willReturn(Optional.of(cell));
        given(bingoCellRepository.save(Mockito.any(BingoCell.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        bingoService.submitCell(2L, 10L, 1000L, "https://example.com/retry.png");

        // then
        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.PENDING);
        assertThat(cell.getRejectionReason()).isNull();
        assertThat(cell.getCompletedAt()).isNull();
    }

    @Test
    @DisplayName("방 멤버가 아니면 칸 제출에 실패한다")
    void submitCellRejectsNonMember() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 3L)).willReturn(false);

        // when & then
        assertErrorCode(
                () -> bingoService.submitCell(3L, 10L, 1000L, "https://example.com/proof.png"),
                ErrorCode.ROOM_MEMBER_FORBIDDEN
        );
    }

    @Test
    @DisplayName("존재하지 않는 칸이면 칸 제출에 실패한다")
    void submitCellRejectsMissingCell() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        BingoBoard board = activeBoard(100L, 10L, 2);
        given(bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(10L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        given(bingoCellRepository.findById(1000L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(
                () -> bingoService.submitCell(1L, 10L, 1000L, "https://example.com/proof.png"),
                ErrorCode.BINGO_CELL_NOT_FOUND
        );
    }

    @Test
    @DisplayName("다른 보드 소속의 칸이면 칸 제출에 실패한다")
    void submitCellRejectsCellFromDifferentBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        BingoBoard board = activeBoard(100L, 10L, 2);
        given(bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(10L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        BingoCell cell = BingoCell.create(999L, 1L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", 1000L);
        given(bingoCellRepository.findById(1000L)).willReturn(Optional.of(cell));

        // when & then
        assertErrorCode(
                () -> bingoService.submitCell(1L, 10L, 1000L, "https://example.com/proof.png"),
                ErrorCode.BINGO_CELL_NOT_FOUND
        );
    }

    @Test
    @DisplayName("host가 완료된 보드를 갱신하면 기존 보드는 COMPLETED로 보존되고 새 보드가 발급된다")
    void renewBoardArchivesOldBoardAndIssuesNewOne() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        BingoBoard activeBoard = activeBoard(100L, 10L, 2);
        given(bingoBoardRepository.findActiveBoardForUpdate(10L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(activeBoard));
        given(bingoCellRepository.existsByBoardIdAndCompletedAtIsNull(100L)).willReturn(false);
        List<Mission> missions = createMissions(4);
        given(missionRepository.findRandomMissions(4)).willReturn(missions);
        given(bingoBoardRepository.save(Mockito.any(BingoBoard.class))).willAnswer(invocation -> {
            BingoBoard board = invocation.getArgument(0);
            if (board.getId() == null) {
                ReflectionTestUtils.setField(board, "id", 200L);
            }
            return board;
        });
        given(bingoCellRepository.save(Mockito.any(BingoCell.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        BingoBoardResponse response = bingoService.renewBoard(1L, 10L);

        // then
        assertThat(activeBoard.getStatus()).isEqualTo(BingoBoardStatus.COMPLETED);
        assertThat(activeBoard.getCompletedAt()).isNotNull();
        assertThat(response.roomId()).isEqualTo(10L);
        assertThat(response.status()).isEqualTo(BingoBoardStatus.IN_PROGRESS);
        assertThat(response.cells()).hasSize(4);
        then(bingoBoardRepository).should().save(activeBoard);
    }

    @Test
    @DisplayName("보드가 100% 완료되지 않았으면 조기 갱신에 실패한다")
    void renewBoardRejectsIncompleteBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        BingoBoard activeBoard = activeBoard(100L, 10L, 2);
        given(bingoBoardRepository.findActiveBoardForUpdate(10L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(activeBoard));
        given(bingoCellRepository.existsByBoardIdAndCompletedAtIsNull(100L)).willReturn(true);

        // when & then
        assertErrorCode(() -> bingoService.renewBoard(1L, 10L), ErrorCode.BINGO_BOARD_NOT_COMPLETED);
        assertThat(activeBoard.getStatus()).isEqualTo(BingoBoardStatus.IN_PROGRESS);
    }

    @Test
    @DisplayName("host가 아니면 조기 갱신에 실패한다")
    void renewBoardRejectsNonHost() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        BingoBoard activeBoard = activeBoard(100L, 10L, 2);
        given(bingoBoardRepository.findActiveBoardForUpdate(10L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(activeBoard));

        // when & then
        assertErrorCode(() -> bingoService.renewBoard(2L, 10L), ErrorCode.BINGO_BOARD_RENEWAL_FORBIDDEN);
    }

    @Test
    @DisplayName("방이 진행 중이 아니면 조기 갱신에 실패한다")
    void renewBoardRejectsRoomNotInProgress() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, 3, 2);
        ReflectionTestUtils.setField(room, "id", 10L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));

        // when & then
        assertErrorCode(() -> bingoService.renewBoard(1L, 10L), ErrorCode.ROOM_NOT_IN_PROGRESS);
    }

    @Test
    @DisplayName("게임이 COMPLETED된 방이면 조기 갱신에 실패한다 (ROOM_NOT_IN_PROGRESS 가드로 이미 커버됨)")
    void renewBoardRejectsCompletedRoom() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.COMPLETED);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));

        // when & then
        assertErrorCode(() -> bingoService.renewBoard(1L, 10L), ErrorCode.ROOM_NOT_IN_PROGRESS);
    }

    @Test
    @DisplayName("활성 보드가 없으면 조기 갱신에 실패한다")
    void renewBoardRejectsMissingBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(bingoBoardRepository.findActiveBoardForUpdate(10L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.empty());

        // when & then
        assertErrorCode(() -> bingoService.renewBoard(1L, 10L), ErrorCode.BINGO_BOARD_NOT_FOUND);
    }

    @Test
    @DisplayName("미션 풀이 부족하면 조기 갱신에 실패하고 기존 보드는 그대로 유지된다")
    void renewBoardRejectsInsufficientMissionsAndKeepsOldBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        BingoBoard activeBoard = activeBoard(100L, 10L, 2);
        given(bingoBoardRepository.findActiveBoardForUpdate(10L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(activeBoard));
        given(bingoCellRepository.existsByBoardIdAndCompletedAtIsNull(100L)).willReturn(false);
        given(missionRepository.findRandomMissions(4)).willReturn(createMissions(3));

        // when & then
        assertErrorCode(() -> bingoService.renewBoard(1L, 10L), ErrorCode.MISSION_POOL_INSUFFICIENT);
        assertThat(activeBoard.getStatus()).isEqualTo(BingoBoardStatus.IN_PROGRESS);
        then(bingoBoardRepository).should(Mockito.never()).save(activeBoard);
    }

    @Test
    @DisplayName("생성된 지 7일 이상 지난 보드는 미완료 상태여도 강제로 만료되고 새 보드가 발급된다")
    void autoRenewBoardForcesRenewalForOldIncompleteBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        BingoBoard activeBoard = activeBoard(100L, 10L, 2);
        ReflectionTestUtils.setField(activeBoard, "createdAt", LocalDateTime.now().minusDays(8));
        given(bingoBoardRepository.findActiveBoardForUpdate(10L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(activeBoard));
        given(bingoCellRepository.existsByBoardIdAndCompletedAtIsNull(100L)).willReturn(true);
        List<Mission> missions = createMissions(4);
        given(missionRepository.findRandomMissions(4)).willReturn(missions);
        given(bingoBoardRepository.save(Mockito.any(BingoBoard.class))).willAnswer(invocation -> {
            BingoBoard board = invocation.getArgument(0);
            if (board.getId() == null) {
                ReflectionTestUtils.setField(board, "id", 200L);
            }
            return board;
        });
        given(bingoCellRepository.save(Mockito.any(BingoCell.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        bingoService.autoRenewBoard(10L);

        // then
        assertThat(activeBoard.getStatus()).isEqualTo(BingoBoardStatus.EXPIRED);
        then(bingoBoardRepository).should().save(activeBoard);
        then(missionRepository).should().findRandomMissions(4);
    }

    @Test
    @DisplayName("생성된 지 7일 이상 지난 보드는 100% 완료된 상태여도 동일하게 강제 갱신된다")
    void autoRenewBoardForcesRenewalForOldCompletedBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        BingoBoard activeBoard = activeBoard(100L, 10L, 2);
        ReflectionTestUtils.setField(activeBoard, "createdAt", LocalDateTime.now().minusDays(8));
        given(bingoBoardRepository.findActiveBoardForUpdate(10L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(activeBoard));
        given(bingoCellRepository.existsByBoardIdAndCompletedAtIsNull(100L)).willReturn(false);
        List<Mission> missions = createMissions(4);
        given(missionRepository.findRandomMissions(4)).willReturn(missions);
        given(bingoBoardRepository.save(Mockito.any(BingoBoard.class))).willAnswer(invocation -> {
            BingoBoard board = invocation.getArgument(0);
            if (board.getId() == null) {
                ReflectionTestUtils.setField(board, "id", 200L);
            }
            return board;
        });
        given(bingoCellRepository.save(Mockito.any(BingoCell.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        bingoService.autoRenewBoard(10L);

        // then
        assertThat(activeBoard.getStatus()).isEqualTo(BingoBoardStatus.EXPIRED);
        then(bingoBoardRepository).should().save(activeBoard);
        then(missionRepository).should().findRandomMissions(4);
    }

    @Test
    @DisplayName("생성된 지 7일이 지나지 않은 보드는 자동 갱신되지 않는다")
    void autoRenewBoardSkipsRecentBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        BingoBoard activeBoard = activeBoard(100L, 10L, 2);
        ReflectionTestUtils.setField(activeBoard, "createdAt", LocalDateTime.now().minusDays(3));
        given(bingoBoardRepository.findActiveBoardForUpdate(10L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(activeBoard));

        // when
        bingoService.autoRenewBoard(10L);

        // then
        assertThat(activeBoard.getStatus()).isEqualTo(BingoBoardStatus.IN_PROGRESS);
        then(bingoBoardRepository).should(Mockito.never()).save(Mockito.any(BingoBoard.class));
        then(missionRepository).should(Mockito.never()).findRandomMissions(Mockito.anyInt());
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
