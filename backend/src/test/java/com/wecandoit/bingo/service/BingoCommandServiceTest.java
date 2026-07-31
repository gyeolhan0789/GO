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
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.GameCycleCommandService;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.repository.MissionRepository;
import com.wecandoit.notification.domain.NotificationType;
import com.wecandoit.notification.event.NotificationMessageFactory;
import com.wecandoit.notification.event.NotificationRequestedEvent;
import com.wecandoit.notification.repository.NotificationRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("빙고판 커맨드 서비스")
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class BingoCommandServiceTest {

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
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private GameCycleCommandService gameCycleCommandService;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private NotificationMessageFactory notificationMessageFactory;
    @InjectMocks
    private BingoCommandService bingoCommandService;

    @BeforeEach
    void setUpActiveGame() {
        Game game = Game.start(10L);
        ReflectionTestUtils.setField(game, "id", 200L);
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(10L, GameStatus.IN_PROGRESS))
                .willReturn(Optional.of(game));
    }

    @Test
    @DisplayName("방장이 진행 중인 방에서 빙고판을 생성하면 보드 크기만큼 무작위 미션이 배정된다")
    void generateInitialBoardCreatesBoardWithRandomMissions() {
        // given
        Room room = inProgressRoom(1L, 10L, 3);
        given(bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.empty());
        List<Mission> missions = createMissions(9);
        given(missionRepository.findRandomMissions(9)).willReturn(missions);
        given(bingoBoardRepository.save(Mockito.any(BingoBoard.class))).willAnswer(invocation -> {
            BingoBoard board = invocation.getArgument(0);
            ReflectionTestUtils.setField(board, "id", 100L);
            return board;
        });
        given(bingoCellRepository.save(Mockito.any(BingoCell.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        BingoBoardResponse response = bingoCommandService.generateInitialBoard(room, 200L);

        // then
        assertThat(response.roomId()).isEqualTo(10L);
        assertThat(response.boardSize()).isEqualTo(3);
        assertThat(response.targetStepCount()).isEqualTo(10_000);
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
    @DisplayName("이미 빙고판이 존재하는 방이면 미션을 조회하지 않고 빙고판 생성에 실패한다")
    void generateInitialBoardRejectsExistingBoardBeforeMissionSelection() {
        // given
        Room room = inProgressRoom(1L, 10L, 3);
        given(bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(BingoBoard.create(10L, 3)));

        // when & then
        assertErrorCode(() -> bingoCommandService.generateInitialBoard(room, 200L),
                ErrorCode.BINGO_BOARD_ALREADY_EXISTS);
        then(missionRepository).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("미션 풀이 부족하면 보드를 저장하지 않고 빙고판 생성에 실패한다")
    void generateInitialBoardRejectsInsufficientMissionsBeforeBoardPersistence() {
        // given
        Room room = inProgressRoom(1L, 10L, 3);
        given(bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.empty());
        given(missionRepository.findRandomMissions(9)).willReturn(createMissions(8));

        // when & then
        assertErrorCode(() -> bingoCommandService.generateInitialBoard(room, 200L),
                ErrorCode.MISSION_POOL_INSUFFICIENT);
        then(bingoBoardRepository).should(Mockito.never()).save(Mockito.any(BingoBoard.class));
    }

    @Test
    @DisplayName("게임이 시작되지 않은 방이면 빙고판 생성에 실패한다")
    void generateInitialBoardDoesNotRequireASeparateRoomLookup() {
        // given
        Room room = inProgressRoom(1L, 10L, 3);
        given(bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.empty());
        given(missionRepository.findRandomMissions(9)).willReturn(createMissions(9));
        given(bingoBoardRepository.save(Mockito.any(BingoBoard.class))).willAnswer(invocation -> {
            BingoBoard board = invocation.getArgument(0);
            ReflectionTestUtils.setField(board, "id", 100L);
            return board;
        });
        given(bingoCellRepository.save(Mockito.any(BingoCell.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        bingoCommandService.generateInitialBoard(room, 200L);

        // then
        then(roomRepository).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("이미 빙고판이 존재하는 방이면 빙고판 생성에 실패한다")
    void generateInitialBoardRejectsExistingBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 3);
        given(bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(BingoBoard.create(10L, 3)));

        // when & then
        assertErrorCode(() -> bingoCommandService.generateInitialBoard(room, 200L),
                ErrorCode.BINGO_BOARD_ALREADY_EXISTS);
    }

    @Test
    @DisplayName("미션 풀이 보드 칸 수보다 적으면 빙고판 생성에 실패한다")
    void generateInitialBoardRejectsInsufficientMissions() {
        // given
        Room room = inProgressRoom(1L, 10L, 3);
        given(bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.empty());
        given(missionRepository.findRandomMissions(9)).willReturn(createMissions(8));

        // when & then
        assertErrorCode(() -> bingoCommandService.generateInitialBoard(room, 200L),
                ErrorCode.MISSION_POOL_INSUFFICIENT);
    }

    @Test
    @DisplayName("대결 빙고판은 참가자별로 서로 다른 보드와 셀을 생성한다")
    void generateBattleBoardsCreatesIndependentBoardsAndCells() {
        // given
        Room room = Room.create(1L, "테스트 방", GameMode.BATTLE, 3, 2);
        ReflectionTestUtils.setField(room, "id", 10L);
        RoomMember hostMember = RoomMember.create(10L, 1L);
        RoomMember guestMember = RoomMember.create(10L, 2L);
        ReflectionTestUtils.setField(hostMember, "id", 101L);
        ReflectionTestUtils.setField(guestMember, "id", 102L);
        given(bingoBoardRepository.existsByRoomMemberId(101L)).willReturn(false);
        given(bingoBoardRepository.existsByRoomMemberId(102L)).willReturn(false);
        given(missionRepository.findRandomMissions(4))
                .willReturn(createMissions(4))
                .willReturn(createMissions(4));
        List<BingoBoard> savedBoards = new ArrayList<>();
        given(bingoBoardRepository.save(Mockito.any(BingoBoard.class))).willAnswer(invocation -> {
            BingoBoard board = invocation.getArgument(0);
            ReflectionTestUtils.setField(board, "id", board.getRoomMember().getId() + 100L);
            savedBoards.add(board);
            return board;
        });
        List<BingoCell> savedCells = new ArrayList<>();
        given(bingoCellRepository.save(Mockito.any(BingoCell.class))).willAnswer(invocation -> {
            BingoCell cell = invocation.getArgument(0);
            savedCells.add(cell);
            return cell;
        });

        // when
        List<BingoBoardResponse> responses =
                bingoCommandService.generateBattleBoards(room, 200L, List.of(hostMember, guestMember));

        // then
        assertThat(responses).extracting(BingoBoardResponse::bingoBoardId)
                .containsExactly(201L, 202L);
        assertThat(responses).extracting(response -> response.cells().size())
                .containsExactly(4, 4);
        assertThat(savedBoards).extracting(board -> board.getRoomMember().getId())
                .containsExactly(101L, 102L);
        assertThat(savedCells).extracting(BingoCell::getBoardId)
                .containsExactly(201L, 201L, 201L, 201L, 202L, 202L, 202L, 202L);
    }

    @Test
    @DisplayName("동일한 대결 참가자에게 빙고판이 이미 있으면 중복 생성하지 않는다")
    void generateBattleBoardsRejectsExistingRoomMemberBoard() {
        // given
        Room room = Room.create(1L, "테스트 방", GameMode.BATTLE, 3, 3);
        ReflectionTestUtils.setField(room, "id", 10L);
        RoomMember hostMember = RoomMember.create(10L, 1L);
        RoomMember guestMember = RoomMember.create(10L, 2L);
        ReflectionTestUtils.setField(hostMember, "id", 101L);
        ReflectionTestUtils.setField(guestMember, "id", 102L);
        given(bingoBoardRepository.existsByRoomMemberId(101L)).willReturn(true);

        // when & then
        assertErrorCode(
                () -> bingoCommandService.generateBattleBoards(room, 200L, List.of(hostMember, guestMember)),
                ErrorCode.BINGO_BOARD_ALREADY_EXISTS
        );
        then(bingoBoardRepository).should(Mockito.never()).save(Mockito.any(BingoBoard.class));
    }

    @Test
    @DisplayName("방 멤버가 칸을 제출하면 검증 대기 상태가 되고 완료 처리되지 않는다")
    void submitCellSetsPendingStatusWithoutCompleting() {
        // given
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(true);
        BingoBoard board = activeBoard(100L, 200L, 2);
        given(bingoBoardRepository.findActiveBoardForUpdate(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        BingoCell cell = BingoCell.create(100L, 1L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", 1000L);
        given(bingoCellRepository.findByIdForUpdate(1000L)).willReturn(Optional.of(cell));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(inProgressRoom(1L, 10L, 2)));
        given(bingoCellRepository.save(Mockito.any(BingoCell.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        bingoCommandService.submitCell(2L, 10L, 1000L, "https://example.com/proof.png");

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
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(true);
        BingoBoard board = activeBoard(100L, 200L, 2);
        given(bingoBoardRepository.findActiveBoardForUpdate(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        BingoCell cell = BingoCell.create(100L, 1L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", 1000L);
        cell.reject("인증 이미지가 조건과 다릅니다.");
        given(bingoCellRepository.findByIdForUpdate(1000L)).willReturn(Optional.of(cell));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(inProgressRoom(1L, 10L, 2)));
        given(bingoCellRepository.save(Mockito.any(BingoCell.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        bingoCommandService.submitCell(2L, 10L, 1000L, "https://example.com/retry.png");

        // then
        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.PENDING);
        assertThat(cell.getRejectionReason()).isNull();
        assertThat(cell.getCompletedAt()).isNull();
    }

    @Test
    @DisplayName("방 멤버가 아니면 칸 제출에 실패한다")
    void submitCellRejectsNonMember() {
        // given
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(inProgressRoom(1L, 10L, 2)));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 3L)).willReturn(false);

        // when & then
        assertErrorCode(
                () -> bingoCommandService.submitCell(3L, 10L, 1000L, "https://example.com/proof.png"),
                ErrorCode.ROOM_MEMBER_FORBIDDEN
        );
    }

    @Test
    @DisplayName("존재하지 않는 방이면 칸 제출에 실패한다")
    void submitCellRejectsMissingRoom() {
        // given
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(
                () -> bingoCommandService.submitCell(1L, 10L, 1000L, "https://example.com/proof.png"),
                ErrorCode.ROOM_NOT_FOUND
        );
        then(roomMemberRepository).shouldHaveNoInteractions();
        then(gameRepository).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("존재하지 않는 칸이면 칸 제출에 실패한다")
    void submitCellRejectsMissingCell() {
        // given
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(inProgressRoom(1L, 10L, 2)));
        BingoBoard board = activeBoard(100L, 200L, 2);
        given(bingoBoardRepository.findActiveBoardForUpdate(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        given(bingoCellRepository.findByIdForUpdate(1000L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(
                () -> bingoCommandService.submitCell(1L, 10L, 1000L, "https://example.com/proof.png"),
                ErrorCode.BINGO_CELL_NOT_FOUND
        );
    }

    @Test
    @DisplayName("다른 보드 소속의 칸이면 칸 제출에 실패한다")
    void submitCellRejectsCellFromDifferentBoard() {
        // given
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(inProgressRoom(1L, 10L, 2)));
        BingoBoard board = activeBoard(100L, 200L, 2);
        given(bingoBoardRepository.findActiveBoardForUpdate(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        BingoCell cell = BingoCell.create(999L, 1L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", 1000L);
        given(bingoCellRepository.findByIdForUpdate(1000L)).willReturn(Optional.of(cell));

        // when & then
        assertErrorCode(
                () -> bingoCommandService.submitCell(1L, 10L, 1000L, "https://example.com/proof.png"),
                ErrorCode.BINGO_CELL_NOT_FOUND
        );
    }

    @ParameterizedTest
    @CsvSource({
            "1, 101, 201, 1001",
            "2, 102, 202, 1002"
    })
    @DisplayName("대결 참가자는 각자 본인 RoomMember의 개인 빙고판 셀만 제출한다")
    void submitCellUsesBattleBoardOwnedByRoomMember(
            long memberId,
            long roomMemberId,
            long boardId,
            long cellId
    ) {
        // given
        Room room = Room.create(1L, "테스트 방", GameMode.BATTLE, 3, 2);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        RoomMember roomMember = RoomMember.create(10L, memberId);
        ReflectionTestUtils.setField(roomMember, "id", roomMemberId);
        BingoBoard board = BingoBoard.createForBattle(200L, roomMember, 2);
        ReflectionTestUtils.setField(board, "id", boardId);
        BingoCell cell = BingoCell.create(boardId, 1L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", cellId);
        BingoCell opponentCell = BingoCell.create(boardId == 201L ? 202L : 201L, 2L, 0, 0);
        Game game = Game.start(10L);
        ReflectionTestUtils.setField(game, "id", 200L);
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, memberId)).willReturn(true);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(10L, GameStatus.IN_PROGRESS))
                .willReturn(Optional.of(game));
        given(roomMemberRepository.findByRoomIdAndMemberId(10L, memberId)).willReturn(Optional.of(roomMember));
        given(bingoBoardRepository.findActiveBoardForUpdate(200L, roomMemberId, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        given(bingoCellRepository.findByIdForUpdate(cellId)).willReturn(Optional.of(cell));
        given(bingoCellRepository.save(cell)).willReturn(cell);

        // when
        BingoCell result = bingoCommandService.submitCell(
                memberId,
                10L,
                cellId,
                "https://example.com/proof.png"
        );

        // then
        assertThat(result.getBoardId()).isEqualTo(boardId);
        assertThat(result.getMemberId()).isEqualTo(memberId);
        assertThat(opponentCell.getMemberId()).isNull();
        assertThat(opponentCell.getSubmitUrl()).isNull();
        assertThat(opponentCell.getVerificationStatus()).isNull();
        then(bingoBoardRepository).should(Mockito.never())
                .findActiveBoardForUpdate(200L, INACTIVE_BOARD_STATUSES);
        then(bingoCellRepository).should(Mockito.never()).save(opponentCell);
    }

    @Test
    @DisplayName("검증 중인 칸은 다시 제출할 수 없다")
    void submitCellRejectsPendingCell() {
        // given
        BingoCell cell = givenSubmissionContext(GameRoomStatus.IN_PROGRESS);
        cell.submit(1L, "https://example.com/first.png");

        // when & then
        assertErrorCode(
                () -> bingoCommandService.submitCell(2L, 10L, 1000L, "https://example.com/second.png"),
                ErrorCode.BINGO_CELL_VERIFICATION_IN_PROGRESS
        );
        assertThat(cell.getMemberId()).isEqualTo(1L);
        assertThat(cell.getSubmitUrl()).isEqualTo("https://example.com/first.png");
    }

    @Test
    @DisplayName("승인된 칸은 다시 제출할 수 없다")
    void submitCellRejectsApprovedCell() {
        // given
        BingoCell cell = givenSubmissionContext(GameRoomStatus.IN_PROGRESS);
        cell.submit(1L, "https://example.com/approved.png");
        cell.approve();

        // when & then
        assertErrorCode(
                () -> bingoCommandService.submitCell(2L, 10L, 1000L, "https://example.com/second.png"),
                ErrorCode.BINGO_CELL_ALREADY_APPROVED
        );
        assertThat(cell.getMemberId()).isEqualTo(1L);
        assertThat(cell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.APPROVED);
    }

    @ParameterizedTest
    @EnumSource(value = GameRoomStatus.class, names = {"CREATED", "WAITING", "READY", "COMPLETED", "CLOSED"})
    @DisplayName("진행 중이 아닌 방에서는 칸을 제출할 수 없다")
    void submitCellRejectsRoomNotInProgress(GameRoomStatus status) {
        // given
        givenSubmissionContext(status);

        // when & then
        assertErrorCode(
                () -> bingoCommandService.submitCell(2L, 10L, 1000L, "https://example.com/proof.png"),
                ErrorCode.ROOM_NOT_IN_PROGRESS
        );
    }

    @Test
    @DisplayName("게임 시작 후 7일이 지나면 칸 제출에 실패한다")
    void submitCellRejectsExpiredGameCycle() {
        // given
        givenSubmissionContext(GameRoomStatus.IN_PROGRESS);
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(10L, GameStatus.IN_PROGRESS))
                .willReturn(Optional.of(activeGameStartedAt(LocalDateTime.now().minusDays(8))));

        // when & then
        assertErrorCode(
                () -> bingoCommandService.submitCell(2L, 10L, 1000L, "https://example.com/proof.png"),
                ErrorCode.BINGO_BOARD_RENEWAL_REQUIRED
        );
    }

    @Test
    @DisplayName("빙고판 갱신 요청은 게임 회차 갱신 서비스에 위임한다")
    void renewBoardDelegatesGameCycleRenewal() {
        // given
        BingoBoardResponse expected = new BingoBoardResponse(
                100L,
                200L,
                10L,
                2,
                null,
                12_000,
                0,
                4,
                0,
                BingoBoardStatus.IN_PROGRESS,
                List.of(),
                false,
                false,
                false,
                null,
                null
        );
        given(gameCycleCommandService.renewSharedCycle(1L, 10L, 12_000)).willReturn(expected);

        // when
        BingoBoardResponse response = bingoCommandService.renewBoard(1L, 10L, 12_000);

        // then
        assertThat(response).isEqualTo(expected);
        then(gameCycleCommandService).should().renewSharedCycle(1L, 10L, 12_000);
    }

    @Test
    @DisplayName("갱신 시기가 지난 공유 보드가 있으면 호스트에게 갱신 필요 알림을 발행한다")
    void notifyRenewalRequiredPublishesHostNotificationForOldSharedBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        BingoBoard activeBoard = activeBoard(100L, 200L, 2);
        NotificationRequestedEvent event = new NotificationRequestedEvent(
                1L,
                NotificationType.WEEKLY_BINGO_RENEWAL,
                "제목",
                "본문"
        );
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(10L, GameStatus.IN_PROGRESS))
                .willReturn(Optional.of(activeGameStartedAt(LocalDateTime.now().minusDays(8))));
        given(bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(activeBoard));
        given(notificationRepository.existsByMemberIdAndTypeAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                Mockito.eq(1L),
                Mockito.eq(NotificationType.WEEKLY_BINGO_RENEWAL),
                Mockito.any(LocalDateTime.class),
                Mockito.any(LocalDateTime.class)
        )).willReturn(false);
        given(notificationMessageFactory.weeklyBingoRenewal(1L)).willReturn(event);

        // when
        bingoCommandService.notifyRenewalRequired(10L);

        // then
        ArgumentCaptor<NotificationRequestedEvent> eventCaptor =
                ArgumentCaptor.forClass(NotificationRequestedEvent.class);
        then(eventPublisher).should().publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue()).isEqualTo(event);
    }

    @Test
    @DisplayName("갱신 시기가 지나지 않은 보드는 갱신 필요 알림을 발행하지 않는다")
    void notifyRenewalRequiredSkipsRecentBoard() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        BingoBoard activeBoard = activeBoard(100L, 200L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(activeBoard));

        // when
        bingoCommandService.notifyRenewalRequired(10L);

        // then
        then(notificationRepository).shouldHaveNoInteractions();
        then(eventPublisher).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("오늘 이미 갱신 필요 알림을 보냈으면 다시 발행하지 않는다")
    void notifyRenewalRequiredSkipsDuplicateDailyNotification() {
        // given
        Room room = inProgressRoom(1L, 10L, 2);
        BingoBoard activeBoard = activeBoard(100L, 200L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(10L, GameStatus.IN_PROGRESS))
                .willReturn(Optional.of(activeGameStartedAt(LocalDateTime.now().minusDays(8))));
        given(bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(activeBoard));
        given(notificationRepository.existsByMemberIdAndTypeAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                Mockito.eq(1L),
                Mockito.eq(NotificationType.WEEKLY_BINGO_RENEWAL),
                Mockito.any(LocalDateTime.class),
                Mockito.any(LocalDateTime.class)
        )).willReturn(true);

        // when
        bingoCommandService.notifyRenewalRequired(10L);

        // then
        then(eventPublisher).shouldHaveNoInteractions();
    }

    private BingoBoard activeBoard(Long boardId, Long gameId, int boardSize) {
        BingoBoard board = BingoBoard.create(gameId, boardSize, 10_000);
        ReflectionTestUtils.setField(board, "id", boardId);
        ReflectionTestUtils.setField(board, "createdAt", LocalDateTime.now().minusDays(3));
        return board;
    }

    private Game activeGameStartedAt(LocalDateTime startedAt) {
        Game game = Game.start(10L);
        ReflectionTestUtils.setField(game, "id", 200L);
        ReflectionTestUtils.setField(game, "startedAt", startedAt);
        return game;
    }

    private BingoCell givenSubmissionContext(GameRoomStatus roomStatus) {
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(true);
        BingoBoard board = activeBoard(100L, 200L, 2);
        given(bingoBoardRepository.findActiveBoardForUpdate(200L, INACTIVE_BOARD_STATUSES))
                .willReturn(Optional.of(board));
        BingoCell cell = BingoCell.create(100L, 1L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", 1000L);
        given(bingoCellRepository.findByIdForUpdate(1000L)).willReturn(Optional.of(cell));
        Room room = inProgressRoom(1L, 10L, 2);
        ReflectionTestUtils.setField(room, "status", roomStatus);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        return cell;
    }

    private Room inProgressRoom(Long hostId, Long roomId, int boardSize) {
        Room room = Room.create(hostId, "테스트 방", GameMode.SINGLE, null, 10_000, boardSize);
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
