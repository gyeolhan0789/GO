package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wecandoit.bingo.controller.response.BingoCellSubmitResponse;
import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.bingo.event.CooperativeBingoProgressUpdatedEvent;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameParticipant;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.GameResultParticipantRepository;
import com.wecandoit.game.repository.GameResultRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionDifficulty;
import com.wecandoit.mission.domain.MissionType;
import com.wecandoit.mission.repository.MissionRepository;
import com.wecandoit.notification.service.NotificationCommandService;
import com.wecandoit.point.domain.PointHistoryType;
import com.wecandoit.point.repository.PointHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;

@SpringBootTest
@ActiveProfiles("test")
@RecordApplicationEvents
@DisplayName("빙고 칸 활동 미션 완료 통합")
class BingoCompleteCellIntegrationTest {

    private static final int BOARD_SIZE = 3;
    private static final int BATTLE_TARGET_BINGO_COUNT = 1;

    @Autowired
    private BingoCommandService bingoCommandService;
    @Autowired
    private MemberRepository memberRepository;
    @Autowired
    private MissionRepository missionRepository;
    @Autowired
    private RoomRepository roomRepository;
    @Autowired
    private RoomMemberRepository roomMemberRepository;
    @Autowired
    private GameRepository gameRepository;
    @Autowired
    private GameParticipantRepository gameParticipantRepository;
    @Autowired
    private GameResultRepository gameResultRepository;
    @Autowired
    private GameResultParticipantRepository gameResultParticipantRepository;
    @Autowired
    private BingoBoardRepository bingoBoardRepository;
    @Autowired
    private BingoCellRepository bingoCellRepository;
    @Autowired
    private PointHistoryRepository pointHistoryRepository;
    @Autowired
    private ApplicationEvents applicationEvents;
    @MockitoBean
    private NotificationCommandService notificationCommandService;

    private Long memberId;
    private Long opponentMemberId;
    private Long missionId;

    @BeforeEach
    void setUp() {
        pointHistoryRepository.deleteAll();
        gameResultParticipantRepository.deleteAll();
        gameResultRepository.deleteAll();
        bingoCellRepository.deleteAll();
        bingoBoardRepository.deleteAll();
        gameParticipantRepository.deleteAll();
        gameRepository.deleteAll();
        roomMemberRepository.deleteAll();
        roomRepository.deleteAll();
        missionRepository.deleteAll();
        memberRepository.deleteAll();

        memberId = memberRepository.saveAndFlush(Member.create(
                "complete-owner@example.com",
                "encoded-password",
                "complete-owner",
                null,
                Gender.MALE
        )).getId();
        opponentMemberId = memberRepository.saveAndFlush(Member.create(
                "complete-opponent@example.com",
                "encoded-password",
                "complete-opponent",
                null,
                Gender.FEMALE
        )).getId();
        missionId = missionRepository.saveAndFlush(Mission.create(
                "https://example.com/missions/step-total.png",
                MissionType.STEP_TOTAL,
                "누적 5,000보 걷기",
                "오늘 누적 5,000보를 달성하세요.",
                null,
                MissionDifficulty.MEDIUM
        )).getId();
    }

    @Test
    @DisplayName("활동 미션 칸을 완료하면 승인과 포인트 지급이 한 트랜잭션에서 끝난다")
    void completeCellApprovesAndGrantsPointInSingleTransaction() {
        // given
        Long roomId = createCooperateRoom();
        Long cellId = createCooperateCell(roomId);

        // when
        BingoCellSubmitResponse response = bingoCommandService.completeCell(memberId, roomId, cellId);

        // then
        BingoCell completedCell = bingoCellRepository.findById(cellId).orElseThrow();
        assertThat(completedCell.getVerificationStatus()).isEqualTo(BingoCellVerificationStatus.APPROVED);
        assertThat(completedCell.getCompletedAt()).isNotNull();
        assertThat(completedCell.getSubmittedAt()).isNotNull();
        assertThat(completedCell.getMemberId()).isEqualTo(memberId);
        assertThat(response.verificationStatus()).isEqualTo(BingoCellVerificationStatus.APPROVED);
        assertThat(response.submittedByMemberId()).isEqualTo(memberId);
        assertThat(pointHistoryRepository.existsByTypeAndReferenceId(
                PointHistoryType.BINGO_CELL_REWARD,
                cellId
        )).isTrue();
        assertThat(response.rewardPoint()).isPositive();
        assertThat(memberRepository.findById(memberId).orElseThrow().getPoint())
                .isEqualTo(response.rewardPoint());
    }

    @Test
    @DisplayName("대결 모드에서 마지막 칸을 완료하면 게임 완료 판정이 함께 실행된다")
    void completeCellTriggersBattleGameCompletion() {
        // given
        Long roomId = createBattleRoom();
        Game game = gameRepository.saveAndFlush(Game.start(roomId));
        GameParticipant participant = gameParticipantRepository.saveAndFlush(
                GameParticipant.create(game.getId(), memberId));
        GameParticipant opponent = gameParticipantRepository.saveAndFlush(
                GameParticipant.create(game.getId(), opponentMemberId));
        BingoBoard board = bingoBoardRepository.saveAndFlush(BingoBoard.createForBattle(
                game.getId(), participant.getId(), BOARD_SIZE, BATTLE_TARGET_BINGO_COUNT));
        BingoBoard opponentBoard = bingoBoardRepository.saveAndFlush(BingoBoard.createForBattle(
                game.getId(), opponent.getId(), BOARD_SIZE, BATTLE_TARGET_BINGO_COUNT));
        saveApprovedCell(board.getId(), 0, 0);
        saveApprovedCell(board.getId(), 0, 1);
        Long cellId = bingoCellRepository.saveAndFlush(
                BingoCell.create(board.getId(), missionId, 0, 2)).getId();
        bingoCellRepository.saveAndFlush(BingoCell.create(opponentBoard.getId(), missionId, 0, 0));

        // when
        bingoCommandService.completeCell(memberId, roomId, cellId);

        // then
        assertThat(gameRepository.findById(game.getId()).orElseThrow().getStatus())
                .isNotEqualTo(GameStatus.ACTIVE);
        assertThat(gameResultRepository.findByGameId(game.getId())).isPresent();
        assertThat(gameResultParticipantRepository.findAllByGameIdOrderByIdAsc(game.getId()))
                .hasSize(2)
                .extracting(result -> result.getMemberId())
                .containsExactlyInAnyOrder(memberId, opponentMemberId);
    }

    @Test
    @DisplayName("활동 미션 칸 완료도 빙고 진행률 이벤트를 발행한다")
    void completeCellPublishesProgressEvent() {
        // given
        Long roomId = createCooperateRoom();
        Long cellId = createCooperateCell(roomId);

        // when
        bingoCommandService.completeCell(memberId, roomId, cellId);

        // then
        assertThat(applicationEvents.stream(CooperativeBingoProgressUpdatedEvent.class))
                .singleElement()
                .satisfies(event -> {
                    assertThat(event.cellId()).isEqualTo(cellId);
                    assertThat(event.verificationStatus()).isEqualTo(BingoCellVerificationStatus.APPROVED);
                });
    }

    @Test
    @DisplayName("이미 완료된 칸을 다시 완료하면 409이고 포인트가 중복 지급되지 않는다")
    void completeCellRejectsDuplicateCompletion() {
        // given
        Long roomId = createCooperateRoom();
        Long cellId = createCooperateCell(roomId);
        bingoCommandService.completeCell(memberId, roomId, cellId);

        // when & then
        assertThatThrownBy(() -> bingoCommandService.completeCell(memberId, roomId, cellId))
                .isInstanceOf(CustomException.class)
                .extracting(exception -> ((CustomException) exception).getErrorCode())
                .isEqualTo(ErrorCode.BINGO_CELL_ALREADY_APPROVED);
        assertThat(pointHistoryRepository.findAll())
                .filteredOn(history -> history.getType() == PointHistoryType.BINGO_CELL_REWARD)
                .hasSize(1);
    }

    private Long createCooperateRoom() {
        Room room = roomRepository.saveAndFlush(
                Room.create(memberId, "협동 방", GameMode.COOPERATE, null, 10_000, BOARD_SIZE));
        roomMemberRepository.saveAndFlush(RoomMember.create(room.getId(), memberId));
        return room.getId();
    }

    private Long createBattleRoom() {
        Room room = roomRepository.saveAndFlush(Room.create(
                memberId, "대결 방", GameMode.BATTLE, BATTLE_TARGET_BINGO_COUNT, BOARD_SIZE));
        roomMemberRepository.saveAndFlush(RoomMember.create(room.getId(), memberId));
        roomMemberRepository.saveAndFlush(RoomMember.create(room.getId(), opponentMemberId));
        return room.getId();
    }

    private Long createCooperateCell(Long roomId) {
        Game game = gameRepository.saveAndFlush(Game.start(roomId));
        BingoBoard board = bingoBoardRepository.saveAndFlush(
                BingoBoard.create(game.getId(), BOARD_SIZE, 10_000));
        return bingoCellRepository.saveAndFlush(BingoCell.create(board.getId(), missionId, 0, 0)).getId();
    }

    private void saveApprovedCell(Long boardId, int row, int col) {
        BingoCell cell = BingoCell.create(boardId, missionId, row, col);
        cell.submit(memberId, "https://example.com/proof.png");
        cell.approve();
        bingoCellRepository.saveAndFlush(cell);
    }
}
