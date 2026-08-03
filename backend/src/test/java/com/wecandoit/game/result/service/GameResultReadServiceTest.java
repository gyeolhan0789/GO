package com.wecandoit.game.result.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.avatar.service.AvatarReadService;
import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.game.controller.response.GameResultDetailResponse;
import com.wecandoit.game.controller.response.GameResultResponse;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameParticipant;
import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.GameResultParticipant;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.GameResultParticipantRepository;
import com.wecandoit.game.repository.GameResultRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.GameResultReadService;
import com.wecandoit.item.controller.response.CharacterResponse;
import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.repository.MissionRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.SliceImpl;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("게임 결과 조회 서비스")
class GameResultReadServiceTest {

    @Mock
    private GameResultRepository gameResultRepository;

    @Mock
    private GameResultParticipantRepository gameResultParticipantRepository;

    @Mock
    private GameParticipantRepository gameParticipantRepository;

    @Mock
    private GameRepository gameRepository;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private AvatarReadService avatarReadService;

    @Mock
    private BingoBoardRepository bingoBoardRepository;

    @Mock
    private BingoCellRepository bingoCellRepository;

    @Mock
    private MissionRepository missionRepository;

    private GameResultReadService gameResultReadService;

    @BeforeEach
    void setUp() {
        gameResultReadService = new GameResultReadService(
                gameResultRepository,
                gameResultParticipantRepository,
                gameParticipantRepository,
                gameRepository,
                roomRepository,
                memberRepository,
                avatarReadService,
                bingoBoardRepository,
                bingoCellRepository,
                missionRepository
        );
    }

    @Test
    @DisplayName("닫힌 방을 나간 참가자도 gameId로 공유 회차 결과를 조회한다")
    void getSharedGameResultByGameId() {
        Fixture fixture = sharedFixture();
        givenDetailContext(fixture);

        GameResultDetailResponse response = gameResultReadService.getGameResult(2L, 100L);

        assertThat(response.gameId()).isEqualTo(100L);
        assertThat(response.roomId()).isEqualTo(10L);
        assertThat(response.boardSize()).isEqualTo(3);
        assertThat(response.targetBingoCount()).isNull();
        assertThat(response.targetStepCount()).isEqualTo(12_000);
        assertThat(response.startedAt()).isEqualTo(fixture.game().getStartedAt());
        assertThat(response.completedAt()).isEqualTo(fixture.game().getCompletedAt());
        assertThat(response.myCompletedMissionCount()).isEqualTo(1);
        assertThat(response.participants()).first().satisfies(participant -> {
            assertThat(participant.gender()).isEqualTo(Gender.MALE);
            assertThat(participant.defaultImageUrl()).isEqualTo("https://example.com/male.png");
            assertThat(participant.equippedItems()).hasSize(1);
        });
        assertThat(response.bingoBoards()).singleElement()
                .satisfies(board -> assertThat(board.owners()).hasSize(2));
        then(avatarReadService).should().getAvatars(fixture.members());
    }

    @Test
    @DisplayName("대결 결과 보드는 GameParticipant 한 명을 소유자로 반환한다")
    void getBattleGameResultUsesGameParticipantOwner() {
        Fixture fixture = battleFixture();
        givenDetailContext(fixture);

        GameResultDetailResponse response = gameResultReadService.getGameResult(1L, 100L);

        assertThat(response.targetStepCount()).isNull();
        assertThat(response.bingoBoards()).hasSize(2);
        assertThat(response.bingoBoards())
                .allSatisfy(board -> assertThat(board.owners()).hasSize(1));
    }

    @Test
    @DisplayName("해당 회차 결과 참가자가 아니면 상세 조회할 수 없다")
    void getGameResultRejectsNonParticipant() {
        Fixture fixture = sharedFixture();
        given(gameRepository.findById(100L)).willReturn(Optional.of(fixture.game()));
        given(roomRepository.findById(10L)).willReturn(Optional.of(fixture.room()));
        given(gameResultRepository.findByGameId(100L)).willReturn(Optional.of(fixture.result()));
        given(gameResultParticipantRepository.findAllByGameIdOrderByIdAsc(100L))
                .willReturn(fixture.participants());
        assertThatThrownBy(() -> gameResultReadService.getGameResult(3L, 100L))
                .isInstanceOf(CustomException.class)
                .extracting(exception -> ((CustomException) exception).getErrorCode())
                .isEqualTo(ErrorCode.ROOM_MEMBER_FORBIDDEN);
    }

    @Test
    @DisplayName("결과 보드가 없으면 상세 조회에 실패한다")
    void getGameResultRejectsMissingBoard() {
        Fixture fixture = sharedFixture();
        given(gameRepository.findById(100L)).willReturn(Optional.of(fixture.game()));
        given(roomRepository.findById(10L)).willReturn(Optional.of(fixture.room()));
        given(gameResultRepository.findByGameId(100L)).willReturn(Optional.of(fixture.result()));
        given(gameResultParticipantRepository.findAllByGameIdOrderByIdAsc(100L))
                .willReturn(fixture.participants());
        given(bingoBoardRepository.findAllByGameIdOrderByIdAsc(100L)).willReturn(List.of());

        assertThatThrownBy(() -> gameResultReadService.getGameResult(1L, 100L))
                .isInstanceOf(CustomException.class)
                .extracting(exception -> ((CustomException) exception).getErrorCode())
                .isEqualTo(ErrorCode.BINGO_BOARD_NOT_FOUND);
    }

    @Test
    @DisplayName("내 결과 목록은 결과 참가자 기준으로 회차 설정과 내 결과를 반환한다")
    void getMyGameResults() {
        Fixture fixture = sharedFixture();
        Pageable pageable = PageRequest.of(0, 20);
        given(gameResultRepository.findAllByParticipantMemberIdOrderByCreatedAtDescIdDesc(
                2L,
                pageable
        )).willReturn(new SliceImpl<>(List.of(fixture.result()), pageable, false));
        given(roomRepository.findAllById(List.of(10L))).willReturn(List.of(fixture.room()));
        given(gameRepository.findAllById(List.of(100L))).willReturn(List.of(fixture.game()));
        given(gameResultParticipantRepository.findAllByGameIdInOrderByIdAsc(List.of(100L)))
                .willReturn(fixture.participants());
        given(memberRepository.findAllById(List.of(1L, 2L))).willReturn(fixture.members());
        given(avatarReadService.getAvatars(fixture.members())).willReturn(avatars(fixture.members()));
        given(bingoBoardRepository.findAllByGameIdInOrderByIdAsc(List.of(100L)))
                .willReturn(fixture.boards());
        given(bingoCellRepository.findAllByBoardIdIn(List.of(200L))).willReturn(fixture.cells());

        SliceResponse<GameResultResponse> response =
                gameResultReadService.getMyGameResults(2L, pageable);

        assertThat(response.content()).singleElement().satisfies(result -> {
            assertThat(result.gameId()).isEqualTo(100L);
            assertThat(result.boardSize()).isEqualTo(3);
            assertThat(result.targetBingoCount()).isNull();
            assertThat(result.totalMissionCount()).isEqualTo(2);
            assertThat(result.myCompletedMissionCount()).isEqualTo(1);
            assertThat(result.myResult()).isTrue();
            assertThat(result.participants()).first().satisfies(participant -> {
                assertThat(participant.gender()).isEqualTo(Gender.MALE);
                assertThat(participant.defaultImageUrl()).isEqualTo("https://example.com/male.png");
                assertThat(participant.equippedItems()).hasSize(1);
            });
            assertThat(result.participants()).element(1)
                    .satisfies(participant -> assertThat(participant.equippedItems()).isEmpty());
        });
        then(avatarReadService).should().getAvatars(fixture.members());
    }

    private void givenDetailContext(Fixture fixture) {
        given(gameRepository.findById(100L)).willReturn(Optional.of(fixture.game()));
        given(roomRepository.findById(10L)).willReturn(Optional.of(fixture.room()));
        given(gameResultRepository.findByGameId(100L)).willReturn(Optional.of(fixture.result()));
        given(gameResultParticipantRepository.findAllByGameIdOrderByIdAsc(100L))
                .willReturn(fixture.participants());
        given(gameParticipantRepository.findAllByGameIdOrderByJoinedAtAsc(100L))
                .willReturn(fixture.gameParticipants());
        given(bingoBoardRepository.findAllByGameIdOrderByIdAsc(100L))
                .willReturn(fixture.boards());
        given(memberRepository.findAllById(List.of(1L, 2L))).willReturn(fixture.members());
        given(avatarReadService.getAvatars(fixture.members())).willReturn(avatars(fixture.members()));
        given(bingoCellRepository.findAllByBoardIdIn(
                fixture.boards().stream().map(BingoBoard::getId).toList()
        )).willReturn(fixture.cells());
        given(missionRepository.findAllById(List.of(1L, 2L))).willReturn(fixture.missions());
    }

    private Fixture sharedFixture() {
        Room room = room(GameMode.COOPERATE);
        Game game = endedGame();
        GameResult result = result();
        List<GameResultParticipant> participants = participants();
        BingoBoard board = BingoBoard.create(100L, 3, 12_000);
        ReflectionTestUtils.setField(board, "id", 200L);
        board.completeAt(game.getCompletedAt());
        return new Fixture(
                room,
                game,
                result,
                participants,
                List.of(participant(300L, 1L), participant(301L, 2L)),
                List.of(board),
                cells(200L),
                members(),
                missions()
        );
    }

    private Fixture battleFixture() {
        Room room = room(GameMode.BATTLE);
        Game game = endedGame();
        GameResult result = result();
        List<GameResultParticipant> participants = participants();
        GameParticipant host = participant(300L, 1L);
        GameParticipant guest = participant(301L, 2L);
        BingoBoard hostBoard = BingoBoard.createForBattle(100L, host.getId(), 3, 2);
        BingoBoard guestBoard = BingoBoard.createForBattle(100L, guest.getId(), 3, 2);
        ReflectionTestUtils.setField(hostBoard, "id", 200L);
        ReflectionTestUtils.setField(guestBoard, "id", 201L);
        hostBoard.completeAt(game.getCompletedAt());
        guestBoard.completeAt(game.getCompletedAt());
        return new Fixture(
                room,
                game,
                result,
                participants,
                List.of(host, guest),
                List.of(hostBoard, guestBoard),
                List.of(approvedCell(200L, 1L, 1L), approvedCell(201L, 2L, 2L)),
                members(),
                missions()
        );
    }

    private Room room(GameMode mode) {
        Integer targetStepCount = mode == GameMode.BATTLE ? null : 12_000;
        Room room = Room.create(1L, "기록 방", mode, 2, targetStepCount, 3);
        ReflectionTestUtils.setField(room, "id", 10L);
        room.close();
        return room;
    }

    private Game endedGame() {
        Game game = Game.start(10L);
        ReflectionTestUtils.setField(game, "id", 100L);
        ReflectionTestUtils.setField(game, "startedAt", LocalDateTime.of(2026, 7, 1, 9, 0));
        game.completeAt(LocalDateTime.of(2026, 7, 8, 9, 0));
        return game;
    }

    private GameResult result() {
        GameResult result = GameResult.create(100L, 10L, true, 2, 2, 200L);
        ReflectionTestUtils.setField(result, "id", 1_000L);
        return result;
    }

    private List<GameResultParticipant> participants() {
        return List.of(
                GameResultParticipant.create(100L, 1L, 1, 200L, true),
                GameResultParticipant.create(100L, 2L, 1, 200L, true)
        );
    }

    private GameParticipant participant(Long id, Long memberId) {
        GameParticipant participant = GameParticipant.create(100L, memberId);
        ReflectionTestUtils.setField(participant, "id", id);
        return participant;
    }

    private List<BingoCell> cells(Long boardId) {
        return List.of(
                approvedCell(boardId, 1L, 1L),
                approvedCell(boardId, 2L, 2L)
        );
    }

    private BingoCell approvedCell(Long boardId, Long missionId, Long memberId) {
        BingoCell cell = BingoCell.create(boardId, missionId, 0, Math.toIntExact(missionId - 1));
        cell.submit(memberId, "https://example.com/proof.png");
        cell.approve();
        return cell;
    }

    private List<Member> members() {
        return List.of(member(1L), member(2L));
    }

    private Member member(Long id) {
        Member member = Member.builder()
                .email(id + "@example.com")
                .nickname("member" + id)
                .gender(id == 1L ? Gender.MALE : Gender.FEMALE)
                .build();
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }

    private Map<Long, CharacterResponse> avatars(List<Member> members) {
        EquippedItemResponse equippedItem = new EquippedItemResponse(
                10L,
                100L,
                "빨간 모자",
                ItemCategory.HAT,
                "https://example.com/hat.png"
        );
        Member firstMember = members.getFirst();
        Member secondMember = members.get(1);
        return Map.of(
                firstMember.getId(),
                CharacterResponse.of(
                        firstMember,
                        "https://example.com/male.png",
                        List.of(equippedItem)
                ),
                secondMember.getId(),
                CharacterResponse.of(
                        secondMember,
                        "https://example.com/female.png",
                        List.of()
                )
        );
    }

    private List<Mission> missions() {
        return List.of(mission(1L), mission(2L));
    }

    private Mission mission(Long id) {
        Mission mission = Mission.create(
                "https://example.com/mission.png",
                "OBJECT",
                "미션 " + id,
                "설명",
                null
        );
        ReflectionTestUtils.setField(mission, "id", id);
        return mission;
    }

    private record Fixture(
            Room room,
            Game game,
            GameResult result,
            List<GameResultParticipant> participants,
            List<GameParticipant> gameParticipants,
            List<BingoBoard> boards,
            List<BingoCell> cells,
            List<Member> members,
            List<Mission> missions
    ) {
    }
}
