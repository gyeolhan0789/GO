package com.wecandoit.game.result.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.game.controller.response.GameResultBingoBoardResponse;
import com.wecandoit.game.controller.response.GameResultDetailResponse;
import com.wecandoit.game.controller.response.GameResultResponse;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.GameResultParticipant;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.GameResultParticipantRepository;
import com.wecandoit.game.repository.GameResultRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.GameResultReadService;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.repository.MissionRepository;
import java.util.List;
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
    private RoomRepository roomRepository;
    @Mock
    private RoomMemberRepository roomMemberRepository;
    @Mock
    private MemberRepository memberRepository;
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
                roomRepository,
                roomMemberRepository,
                memberRepository,
                bingoBoardRepository,
                bingoCellRepository,
                missionRepository
        );
    }

    @Test
    @DisplayName("협동 게임 결과를 조회하면 공유 빙고판과 참여자 전원을 보드 사용자로 반환한다")
    void getGameResultReturnsSharedBingoBoard() {
        // given
        Room room = completedRoom(10L, 1L, GameMode.COOPERATE);
        GameResult gameResult = gameResult(100L, 10L, 1000L);
        GameResultParticipant host = participant(100L, 1L, 3);
        GameResultParticipant participant = participant(100L, 2L, 2);
        BingoBoard board = sharedBoard(201L, 100L, 2);
        List<BingoCell> cells = List.of(
                approvedCell(302L, 201L, 402L, 1, 0, 2L),
                approvedCell(301L, 201L, 401L, 0, 0, 1L)
        );
        givenCompletedResult(room, gameResult, List.of(host, participant));
        given(bingoBoardRepository.findAllByGameIdOrderByIdAsc(100L)).willReturn(List.of(board));
        given(memberRepository.findAllById(List.of(1L, 2L)))
                .willReturn(List.of(member(1L, "host"), member(2L, "participant")));
        given(bingoCellRepository.findAllByBoardIdIn(List.of(201L))).willReturn(cells);
        given(missionRepository.findAllById(any())).willReturn(missionsForCells(cells));

        // when
        GameResultDetailResponse response = gameResultReadService.getGameResult(1L, 10L);

        // then
        assertThat(response.roomId()).isEqualTo(10L);
        assertThat(response.gameId()).isEqualTo(100L);
        assertThat(response.mode()).isEqualTo(GameMode.COOPERATE);
        assertThat(response.participants())
                .extracting("memberId", "nickname", "completedMissionCount", "rewardCash")
                .containsExactly(
                        tuple(1L, "host", 3, 200L),
                        tuple(2L, "participant", 2, 200L)
                );
        assertThat(response.bingoBoards()).hasSize(1);
        GameResultBingoBoardResponse bingoBoard = response.bingoBoards().get(0);
        assertThat(bingoBoard.owners())
                .extracting("memberId", "nickname")
                .containsExactly(
                        tuple(1L, "host"),
                        tuple(2L, "participant")
                );
        assertThat(bingoBoard.completedBingoCount()).isEqualTo(1);
        assertThat(bingoBoard.totalCellCount()).isEqualTo(2);
        assertThat(bingoBoard.approvedCellCount()).isEqualTo(2);
        assertThat(bingoBoard.cells())
                .extracting("cellId", "row", "col", "submittedByMemberId", "verificationStatus")
                .containsExactly(
                        tuple(301L, 0, 0, 1L, BingoCellVerificationStatus.APPROVED),
                        tuple(302L, 1, 0, 2L, BingoCellVerificationStatus.APPROVED)
                );
    }

    @Test
    @DisplayName("배틀 게임 결과를 조회하면 참여자별 개인 빙고판과 보드 주인 1명을 반환한다")
    void getGameResultReturnsBattleBingoBoards() {
        // given
        Room room = completedRoom(10L, 1L, GameMode.BATTLE);
        GameResult gameResult = gameResult(100L, 10L, 1000L);
        GameResultParticipant winner = participant(100L, 1L, 3);
        GameResultParticipant loser = participant(100L, 2L, 2);
        RoomMember firstRoomMember = roomMember(11L, 10L, 1L);
        RoomMember secondRoomMember = roomMember(12L, 10L, 2L);
        BingoBoard firstBoard = battleBoard(201L, 100L, firstRoomMember, 2);
        BingoBoard secondBoard = battleBoard(202L, 100L, secondRoomMember, 2);
        List<BingoCell> cells = List.of(
                approvedCell(301L, 201L, 401L, 0, 0, 1L),
                approvedCell(302L, 202L, 402L, 0, 0, 2L)
        );
        givenCompletedResult(room, gameResult, List.of(winner, loser));
        given(bingoBoardRepository.findAllByGameIdOrderByIdAsc(100L))
                .willReturn(List.of(firstBoard, secondBoard));
        given(memberRepository.findAllById(List.of(1L, 2L)))
                .willReturn(List.of(member(1L, "winner"), member(2L, "loser")));
        given(bingoCellRepository.findAllByBoardIdIn(List.of(201L, 202L))).willReturn(cells);
        given(missionRepository.findAllById(any())).willReturn(missionsForCells(cells));

        // when
        GameResultDetailResponse response = gameResultReadService.getGameResult(1L, 10L);

        // then
        assertThat(response.bingoBoards()).hasSize(2);
        assertThat(response.bingoBoards().get(0).owners())
                .extracting("memberId", "nickname")
                .containsExactly(tuple(1L, "winner"));
        assertThat(response.bingoBoards().get(1).owners())
                .extracting("memberId", "nickname")
                .containsExactly(tuple(2L, "loser"));
    }

    @Test
    @DisplayName("존재하지 않는 방의 결과를 조회하면 실패한다")
    void getGameResultRejectsMissingRoom() {
        // given
        given(roomRepository.findById(10L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(() -> gameResultReadService.getGameResult(1L, 10L), ErrorCode.ROOM_NOT_FOUND);
    }

    @Test
    @DisplayName("방 참여자가 아니면 결과 조회에 실패한다")
    void getGameResultRejectsNonMember() {
        // given
        Room room = completedRoom(10L, 1L, GameMode.SINGLE);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(false);

        // when & then
        assertErrorCode(() -> gameResultReadService.getGameResult(2L, 10L), ErrorCode.ROOM_MEMBER_FORBIDDEN);
    }

    @Test
    @DisplayName("완료되지 않은 방의 결과를 조회하면 실패한다")
    void getGameResultRejectsNotCompletedRoom() {
        // given
        Room room = Room.create(1L, "테스트 방", GameMode.SINGLE, null, 3);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(gameResultRepository.findFirstByRoomIdOrderByCreatedAtDescIdDesc(10L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(() -> gameResultReadService.getGameResult(1L, 10L), ErrorCode.GAME_NOT_COMPLETED);
    }

    @Test
    @DisplayName("완료 결과에 해당하는 빙고판이 없으면 실패한다")
    void getGameResultRejectsMissingBingoBoard() {
        // given
        Room room = completedRoom(10L, 1L, GameMode.COOPERATE);
        GameResult gameResult = gameResult(100L, 10L, 1000L);
        givenCompletedResult(room, gameResult, List.of(participant(100L, 1L, 3)));
        given(bingoBoardRepository.findAllByGameIdOrderByIdAsc(100L)).willReturn(List.of());

        // when & then
        assertErrorCode(() -> gameResultReadService.getGameResult(1L, 10L), ErrorCode.BINGO_BOARD_NOT_FOUND);
    }

    @Test
    @DisplayName("빙고 칸의 미션을 찾지 못하면 실패한다")
    void getGameResultRejectsMissingMission() {
        // given
        Room room = completedRoom(10L, 1L, GameMode.COOPERATE);
        GameResult gameResult = gameResult(100L, 10L, 1000L);
        GameResultParticipant participant = participant(100L, 1L, 3);
        BingoBoard board = sharedBoard(201L, 100L, 2);
        List<BingoCell> cells = List.of(approvedCell(301L, 201L, 401L, 0, 0, 1L));
        givenCompletedResult(room, gameResult, List.of(participant));
        given(bingoBoardRepository.findAllByGameIdOrderByIdAsc(100L)).willReturn(List.of(board));
        given(memberRepository.findAllById(List.of(1L))).willReturn(List.of(member(1L, "member1")));
        given(bingoCellRepository.findAllByBoardIdIn(List.of(201L))).willReturn(cells);
        given(missionRepository.findAllById(any())).willReturn(List.of());

        // when & then
        assertErrorCode(() -> gameResultReadService.getGameResult(1L, 10L), ErrorCode.MISSION_NOT_FOUND);
    }

    @Test
    @DisplayName("참여했던 방들의 게임 결과를 최신순으로 반환한다")
    void getMyGameResultsReturnsResultsOrderedByLatest() {
        // given
        RoomMember firstRoomMember = RoomMember.create(10L, 1L);
        RoomMember secondRoomMember = RoomMember.create(20L, 1L);
        GameResult latestResult = gameResult(200L, 20L, 2000L);
        GameResultParticipant participant = participant(200L, 1L, 9);
        Pageable pageable = PageRequest.of(0, 10);
        given(roomMemberRepository.findAllByMemberIdOrderByJoinedAtDesc(1L))
                .willReturn(List.of(secondRoomMember, firstRoomMember));
        given(gameResultRepository.findByRoomIdInOrderByCreatedAtDesc(List.of(20L, 10L), pageable))
                .willReturn(new SliceImpl<>(List.of(latestResult), pageable, false));
        given(roomRepository.findAllById(List.of(20L)))
                .willReturn(List.of(completedRoom(20L, 1L, GameMode.SINGLE)));
        given(gameResultParticipantRepository.findAllByGameIdInOrderByIdAsc(List.of(200L)))
                .willReturn(List.of(participant));
        given(memberRepository.findAllById(List.of(1L))).willReturn(List.of(member(1L, "member1")));

        // when
        SliceResponse<GameResultResponse> response = gameResultReadService.getMyGameResults(1L, pageable);

        // then
        assertThat(response.content()).hasSize(1);
        assertThat(response.content().get(0).roomId()).isEqualTo(20L);
        assertThat(response.content().get(0).boardSize()).isEqualTo(3);
        assertThat(response.content().get(0).participants()).hasSize(1);
        assertThat(response.hasNext()).isFalse();
    }

    @Test
    @DisplayName("참여했던 방이 없으면 빈 결과 목록을 반환한다")
    void getMyGameResultsReturnsEmptySliceWhenNoRooms() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        given(roomMemberRepository.findAllByMemberIdOrderByJoinedAtDesc(1L)).willReturn(List.of());

        // when
        SliceResponse<GameResultResponse> response = gameResultReadService.getMyGameResults(1L, pageable);

        // then
        assertThat(response.content()).isEmpty();
        assertThat(response.hasNext()).isFalse();
    }

    private void givenCompletedResult(
            Room room,
            GameResult gameResult,
            List<GameResultParticipant> participants
    ) {
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(gameResultRepository.findFirstByRoomIdOrderByCreatedAtDescIdDesc(10L))
                .willReturn(Optional.of(gameResult));
        given(gameResultParticipantRepository.findAllByGameIdOrderByIdAsc(gameResult.getGameId()))
                .willReturn(participants);
    }

    private Room completedRoom(Long roomId, Long hostId, GameMode mode) {
        Room room = Room.create(hostId, "테스트 방", mode, mode == GameMode.SINGLE ? null : 3, 3);
        ReflectionTestUtils.setField(room, "id", roomId);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.COMPLETED);
        return room;
    }

    private RoomMember roomMember(Long id, Long roomId, Long memberId) {
        RoomMember roomMember = RoomMember.create(roomId, memberId);
        ReflectionTestUtils.setField(roomMember, "id", id);
        return roomMember;
    }

    private GameResult gameResult(Long gameId, Long roomId, Long resultId) {
        GameResult gameResult = GameResult.create(gameId, roomId, true, 3, 5, 200L);
        ReflectionTestUtils.setField(gameResult, "id", resultId);
        return gameResult;
    }

    private GameResultParticipant participant(Long gameId, Long memberId, int completedMissionCount) {
        return GameResultParticipant.create(gameId, memberId, completedMissionCount, 200L, true);
    }

    private BingoBoard sharedBoard(Long boardId, Long gameId, int boardSize) {
        BingoBoard board = BingoBoard.create(gameId, boardSize);
        ReflectionTestUtils.setField(board, "id", boardId);
        return board;
    }

    private BingoBoard battleBoard(Long boardId, Long gameId, RoomMember roomMember, int boardSize) {
        BingoBoard board = BingoBoard.createForBattle(gameId, roomMember, boardSize);
        ReflectionTestUtils.setField(board, "id", boardId);
        return board;
    }

    private BingoCell approvedCell(
            Long cellId,
            Long boardId,
            Long missionId,
            int row,
            int col,
            Long memberId
    ) {
        BingoCell cell = BingoCell.create(boardId, missionId, row, col);
        ReflectionTestUtils.setField(cell, "id", cellId);
        cell.submit(memberId, "https://example.com/proof.png");
        cell.approve();
        return cell;
    }

    private List<Mission> missionsForCells(List<BingoCell> cells) {
        return cells.stream()
                .map(cell -> mission(cell.getMissionId()))
                .toList();
    }

    private Mission mission(Long missionId) {
        Mission mission = Mission.create(
                "https://example.com/mission.png",
                "OBJECT",
                "미션",
                "설명",
                null
        );
        ReflectionTestUtils.setField(mission, "id", missionId);
        return mission;
    }

    private Member member(Long memberId, String nickname) {
        Member member = Member.builder()
                .email(nickname + "@example.com")
                .nickname(nickname)
                .build();
        ReflectionTestUtils.setField(member, "id", memberId);
        return member;
    }

    private void assertErrorCode(Runnable action, ErrorCode errorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(errorCode);
    }
}
