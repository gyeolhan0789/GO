package com.wecandoit.game.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.game.controller.response.MyRoomResponse;
import com.wecandoit.game.controller.response.RoomDetailResponse;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameParticipant;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.RoomReadService;
import com.wecandoit.game.service.RoomReadService.StepGoalRewardTarget;
import com.wecandoit.member.service.MemberReadService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("게임방 조회 서비스")
class RoomReadServiceTest {

    private static final List<BingoBoardStatus> INACTIVE_BOARD_STATUSES =
            List.of(BingoBoardStatus.COMPLETED, BingoBoardStatus.EXPIRED);

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private RoomMemberRepository roomMemberRepository;

    @Mock
    private GameRepository gameRepository;

    @Mock
    private GameParticipantRepository gameParticipantRepository;

    @Mock
    private MemberReadService memberReadService;

    @Mock
    private BingoBoardRepository bingoBoardRepository;

    @Mock
    private BingoCellRepository bingoCellRepository;

    private RoomReadService roomReadService;

    @BeforeEach
    void setUp() {
        roomReadService = new RoomReadService(
                roomRepository,
                roomMemberRepository,
                gameRepository,
                gameParticipantRepository,
                memberReadService,
                bingoBoardRepository,
                bingoCellRepository
        );
    }

    @Test
    @DisplayName("보드가 한 번도 없으면 방의 최초 설정과 예상 미션 수를 반환한다")
    void getRoomDetailUsesInitialSettingsWithoutGame() {
        Room room = room(10L, GameMode.BATTLE, 3, 2, null);
        RoomMember host = roomMember(10L, 1L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L))
                .willReturn(List.of(host));
        given(gameRepository.findFirstByRoomIdOrderByIdDesc(10L)).willReturn(Optional.empty());
        given(memberReadService.getNicknamesByIds(List.of(1L))).willReturn(Map.of(1L, "방장"));

        RoomDetailResponse response = roomReadService.getRoomDetail(1L, 10L);

        assertThat(response.boardSize()).isEqualTo(3);
        assertThat(response.targetBingoCount()).isEqualTo(2);
        assertThat(response.totalMissionCount()).isEqualTo(9);
        assertThat(response.completedMissionCount()).isZero();
        assertThat(response.startedAt()).isNull();
    }

    @Test
    @DisplayName("공유 회차 상세는 보드 설정과 셀 기준 진행도를 반환한다")
    void getSharedRoomDetailUsesBoardSettingsAndCells() {
        Room room = room(10L, GameMode.COOPERATE, 3, 1, 10_000);
        RoomMember host = roomMember(10L, 1L);
        RoomMember guest = roomMember(10L, 2L);
        Game game = game(100L, 10L);
        BingoBoard board = sharedBoard(200L, 100L, 4, 3, 12_000);
        List<BingoCell> cells = List.of(
                approvedCell(200L, 1L, 1L),
                approvedCell(200L, 2L, 2L),
                BingoCell.create(200L, 3L, 0, 2)
        );
        givenDetailContext(room, List.of(host, guest), game, List.of(), List.of(board), cells);

        RoomDetailResponse response = roomReadService.getRoomDetail(1L, 10L);

        assertThat(response.boardSize()).isEqualTo(4);
        assertThat(response.targetBingoCount()).isEqualTo(3);
        assertThat(response.targetStepCount()).isEqualTo(12_000);
        assertThat(response.totalMissionCount()).isEqualTo(3);
        assertThat(response.completedMissionCount()).isEqualTo(2);
        assertThat(response.members())
                .extracting(member -> member.completedMissionCount())
                .containsExactly(1, 1);
    }

    @Test
    @DisplayName("대결 회차 상세는 GameParticipant별 개인 보드와 진행도를 반환한다")
    void getBattleRoomDetailUsesParticipantBoards() {
        Room room = room(10L, GameMode.BATTLE, 3, 2, null);
        RoomMember host = roomMember(10L, 1L);
        RoomMember guest = roomMember(10L, 2L);
        Game game = game(100L, 10L);
        GameParticipant hostParticipant = participant(300L, 100L, 1L);
        GameParticipant guestParticipant = participant(301L, 100L, 2L);
        BingoBoard hostBoard = battleBoard(200L, 100L, hostParticipant.getId());
        BingoBoard guestBoard = battleBoard(201L, 100L, guestParticipant.getId());
        List<BingoCell> cells = List.of(
                approvedCell(200L, 1L, 1L),
                BingoCell.create(200L, 2L, 0, 1),
                approvedCell(201L, 3L, 2L),
                approvedCell(201L, 4L, 2L)
        );
        givenDetailContext(
                room,
                List.of(host, guest),
                game,
                List.of(hostParticipant, guestParticipant),
                List.of(hostBoard, guestBoard),
                cells
        );

        RoomDetailResponse response = roomReadService.getRoomDetail(1L, 10L);

        assertThat(response.totalMissionCount()).isEqualTo(4);
        assertThat(response.completedMissionCount()).isEqualTo(3);
        assertThat(response.members())
                .extracting(member -> member.bingoBoardId())
                .containsExactly(200L, 201L);
        assertThat(response.members())
                .extracting(member -> member.completedMissionCount())
                .containsExactly(1, 2);
    }

    @Test
    @DisplayName("내 방 목록은 모드 필터를 적용하고 각 최신 회차를 일괄 매핑한다")
    void getMyRoomsMapsMultipleLatestCycles() {
        Room cooperate = room(10L, GameMode.COOPERATE, 3, 1, 10_000);
        Room battle = room(11L, GameMode.BATTLE, 3, 2, null);
        RoomMember myCooperate = roomMember(10L, 1L);
        RoomMember myBattle = roomMember(11L, 1L);
        RoomMember teammate = roomMember(10L, 2L);
        Game cooperateGame = game(100L, 10L);
        Game battleGame = game(101L, 11L);
        BingoBoard cooperateBoard = sharedBoard(200L, 100L, 4, 3, 12_000);
        BingoBoard battleBoard = battleBoard(201L, 101L, 301L);

        given(roomMemberRepository.findAllByMemberIdOrderByJoinedAtDesc(1L))
                .willReturn(List.of(myCooperate, myBattle));
        given(roomRepository.findAllById(List.of(10L, 11L)))
                .willReturn(List.of(cooperate, battle));
        given(roomMemberRepository.findAllByRoomIdInOrderByJoinedAtAsc(List.of(10L)))
                .willReturn(List.of(myCooperate, teammate));
        given(memberReadService.getNicknamesByIds(List.of(1L, 2L)))
                .willReturn(Map.of(1L, "방장", 2L, "참여자"));
        given(gameRepository.findAllByRoomIdIn(List.of(10L)))
                .willReturn(List.of(cooperateGame));
        given(bingoBoardRepository.findAllByGameIdInOrderByIdAsc(List.of(100L)))
                .willReturn(List.of(cooperateBoard));
        given(bingoCellRepository.findAllByBoardIdIn(List.of(200L)))
                .willReturn(List.of(approvedCell(200L, 1L, 1L)));

        List<MyRoomResponse> responses =
                roomReadService.getMyRooms(1L, GameMode.COOPERATE);

        assertThat(responses).singleElement().satisfies(response -> {
            assertThat(response.roomId()).isEqualTo(10L);
            assertThat(response.boardSize()).isEqualTo(4);
            assertThat(response.targetBingoCount()).isEqualTo(3);
            assertThat(response.completedMissionCount()).isEqualTo(1);
        });
        assertThat(battleGame).isNotNull();
        assertThat(battleBoard).isNotNull();
    }

    @Test
    @DisplayName("닫힌 방은 일반 내 방 목록에서 제외한다")
    void getMyRoomsExcludesClosedRoom() {
        Room room = room(10L, GameMode.COOPERATE, 3, 2, 10_000);
        room.close();
        RoomMember roomMember = roomMember(10L, 1L);
        given(roomMemberRepository.findAllByMemberIdOrderByJoinedAtDesc(1L))
                .willReturn(List.of(roomMember));
        given(roomRepository.findAllById(List.of(10L))).willReturn(List.of(room));

        assertThat(roomReadService.getMyRooms(1L, null)).isEmpty();
    }

    @Test
    @DisplayName("걸음 보상 대상은 활성 공유 보드의 목표 걸음 수를 사용한다")
    void getStepGoalRewardTargetsUsesActiveBoardSettings() {
        Room room = room(10L, GameMode.COOPERATE, 3, 2, 10_000);
        RoomMember host = roomMember(10L, 1L);
        RoomMember guest = roomMember(10L, 2L);
        Game game = game(100L, 10L);
        BingoBoard board = sharedBoard(200L, 100L, 4, 3, 12_000);
        ReflectionTestUtils.setField(board, "createdAt", LocalDateTime.of(2026, 7, 31, 9, 0));
        given(roomMemberRepository.findAllByMemberIdOrderByJoinedAtDesc(1L))
                .willReturn(List.of(host));
        given(roomRepository.findAllById(List.of(10L))).willReturn(List.of(room));
        given(gameRepository.findAllByRoomIdInAndStatus(List.of(10L), GameStatus.ACTIVE))
                .willReturn(List.of(game));
        given(bingoBoardRepository.findAllByGameIdInAndStatusNotInOrderByIdAsc(
                List.of(100L),
                INACTIVE_BOARD_STATUSES
        )).willReturn(List.of(board));
        given(roomMemberRepository.findAllByRoomIdInOrderByJoinedAtAsc(List.of(10L)))
                .willReturn(List.of(host, guest));

        List<StepGoalRewardTarget> targets =
                roomReadService.getStepGoalRewardTargets(1L);

        assertThat(targets).singleElement().satisfies(target -> {
            assertThat(target.targetStepCount()).isEqualTo(12_000);
            assertThat(target.members()).hasSize(2);
        });
    }

    private void givenDetailContext(
            Room room,
            List<RoomMember> roomMembers,
            Game game,
            List<GameParticipant> gameParticipants,
            List<BingoBoard> boards,
            List<BingoCell> cells
    ) {
        given(roomRepository.findById(room.getId())).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(room.getId(), 1L)).willReturn(true);
        given(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(room.getId()))
                .willReturn(roomMembers);
        given(gameRepository.findFirstByRoomIdOrderByIdDesc(room.getId()))
                .willReturn(Optional.of(game));
        given(gameParticipantRepository.findAllByGameIdOrderByJoinedAtAsc(game.getId()))
                .willReturn(gameParticipants);
        given(bingoBoardRepository.findAllByGameIdOrderByIdAsc(game.getId()))
                .willReturn(boards);
        given(bingoCellRepository.findAllByBoardIdIn(
                boards.stream().map(BingoBoard::getId).toList()
        )).willReturn(cells);
        given(memberReadService.getNicknamesByIds(
                roomMembers.stream().map(RoomMember::getMemberId).toList()
        )).willReturn(roomMembers.stream().collect(Collectors.toMap(
                RoomMember::getMemberId,
                member -> "회원" + member.getMemberId()
        )));
    }

    private Room room(
            Long id,
            GameMode mode,
            int boardSize,
            int targetBingoCount,
            Integer targetStepCount
    ) {
        Room room = Room.create(1L, "테스트 방", mode, targetBingoCount, targetStepCount, boardSize);
        ReflectionTestUtils.setField(room, "id", id);
        return room;
    }

    private RoomMember roomMember(Long roomId, Long memberId) {
        RoomMember member = RoomMember.create(roomId, memberId);
        ReflectionTestUtils.setField(member, "joinedAt", LocalDateTime.of(2026, 7, 31, 9, 0));
        return member;
    }

    private Game game(Long id, Long roomId) {
        Game game = Game.start(roomId);
        ReflectionTestUtils.setField(game, "id", id);
        ReflectionTestUtils.setField(game, "startedAt", LocalDateTime.of(2026, 7, 31, 9, 0));
        return game;
    }

    private BingoBoard sharedBoard(
            Long id,
            Long gameId,
            int boardSize,
            int targetBingoCount,
            int targetStepCount
    ) {
        BingoBoard board =
                BingoBoard.create(gameId, boardSize, targetBingoCount, targetStepCount);
        ReflectionTestUtils.setField(board, "id", id);
        return board;
    }

    private BingoBoard battleBoard(
            Long id,
            Long gameId,
            Long participantId
    ) {
        BingoBoard board = BingoBoard.createForBattle(gameId, participantId, 3, 2);
        ReflectionTestUtils.setField(board, "id", id);
        return board;
    }

    private GameParticipant participant(Long id, Long gameId, Long memberId) {
        GameParticipant participant = GameParticipant.create(gameId, memberId);
        ReflectionTestUtils.setField(participant, "id", id);
        return participant;
    }

    private BingoCell approvedCell(Long boardId, Long missionId, Long memberId) {
        BingoCell cell = BingoCell.create(boardId, missionId, 0, 0);
        cell.submit(memberId, "https://example.com/proof.png");
        cell.approve();
        return cell;
    }
}
