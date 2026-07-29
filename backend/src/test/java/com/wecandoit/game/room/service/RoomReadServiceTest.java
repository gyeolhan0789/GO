package com.wecandoit.game.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.controller.response.MyRoomResponse;
import com.wecandoit.game.controller.response.RoomDetailResponse;
import com.wecandoit.game.controller.response.RoomMemberResponse;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
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

    @Mock
    private RoomRepository roomRepository;
    @Mock
    private RoomMemberRepository roomMemberRepository;
    @Mock
    private GameRepository gameRepository;
    @Mock
    private MemberReadService memberReadService;
    @Mock
    private BingoBoardRepository bingoBoardRepository;
    private RoomReadService roomReadService;

    @BeforeEach
    void setUp() {
        roomReadService = new RoomReadService(
                roomRepository,
                roomMemberRepository,
                gameRepository,
                memberReadService,
                bingoBoardRepository
        );
    }

    @Test
    @DisplayName("대결 방 상세 조회 시 각 참가자의 개인 빙고판 ID를 반환한다")
    void getBattleRoomDetailReturnsBingoBoardIdsByRoomMember() {
        // given
        Room room = Room.create(1L, "테스트 방", GameMode.BATTLE, 3, 3);
        ReflectionTestUtils.setField(room, "id", 10L);
        RoomMember hostMember = roomMember(10L, 1L, 0, LocalDateTime.of(2026, 7, 22, 10, 0));
        RoomMember guestMember = roomMember(10L, 2L, 0, LocalDateTime.of(2026, 7, 22, 10, 5));
        ReflectionTestUtils.setField(hostMember, "id", 101L);
        ReflectionTestUtils.setField(guestMember, "id", 102L);
        BingoBoard hostBoard = BingoBoard.createForBattle(200L, hostMember, 3);
        BingoBoard guestBoard = BingoBoard.createForBattle(200L, guestMember, 3);
        ReflectionTestUtils.setField(hostBoard, "id", 201L);
        ReflectionTestUtils.setField(guestBoard, "id", 202L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L))
                .willReturn(List.of(hostMember, guestMember));
        given(memberReadService.getNicknamesByIds(List.of(1L, 2L)))
                .willReturn(Map.of(1L, "방장", 2L, "상대방"));
        Game game = Game.start(10L);
        ReflectionTestUtils.setField(game, "id", 200L);
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(10L, GameStatus.IN_PROGRESS))
                .willReturn(Optional.of(game));
        given(bingoBoardRepository.findAllByGameIdOrderByIdAsc(200L))
                .willReturn(List.of(hostBoard, guestBoard));

        // when
        RoomDetailResponse response = roomReadService.getRoomDetail(1L, 10L);

        // then
        assertThat(response.members())
                .extracting(RoomMemberResponse::bingoBoardId)
                .containsExactly(201L, 202L);
    }

    @Test
    @DisplayName("협동 방 참가자는 개인 빙고판 ID를 반환하지 않는다")
    void getCooperateRoomDetailReturnsNullBingoBoardId() {
        // given
        Room room = Room.create(1L, "테스트 방", GameMode.COOPERATE, null, 3);
        ReflectionTestUtils.setField(room, "id", 10L);
        RoomMember hostMember = roomMember(10L, 1L, 0, LocalDateTime.of(2026, 7, 22, 10, 0));
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L)).willReturn(List.of(hostMember));
        given(memberReadService.getNicknamesByIds(List.of(1L))).willReturn(Map.of(1L, "방장"));

        // when
        RoomDetailResponse response = roomReadService.getRoomDetail(1L, 10L);

        // then
        assertThat(response.members().getFirst().bingoBoardId()).isNull();
        then(bingoBoardRepository).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("게임방 상세를 조회하면 방 정보와 참여자 상세 목록을 반환한다")
    void getRoomDetailReturnsRoomDetailWithMembers() {
        // given
        Room room = room(10L, 1L);
        ReflectionTestUtils.setField(room, "startedAt", LocalDateTime.of(2026, 7, 22, 9, 50));
        RoomMember hostMember = roomMember(10L, 1L, 2, LocalDateTime.of(2026, 7, 22, 10, 0));
        RoomMember guestMember = roomMember(10L, 2L, 1, LocalDateTime.of(2026, 7, 22, 10, 5));
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L))
                .willReturn(List.of(hostMember, guestMember));
        given(memberReadService.getNicknamesByIds(List.of(1L, 2L)))
                .willReturn(Map.of(1L, "방장", 2L, "참여자"));

        // when
        RoomDetailResponse response = roomReadService.getRoomDetail(1L, 10L);

        // then
        assertThat(response.roomId()).isEqualTo(10L);
        assertThat(response.name()).isEqualTo("테스트 방");
        assertThat(response.mode()).isEqualTo(GameMode.SINGLE);
        assertThat(response.status()).isEqualTo(GameRoomStatus.CREATED);
        assertThat(response.targetBingoCount()).isNull();
        assertThat(response.hostId()).isEqualTo(1L);
        assertThat(response.startedAt()).isEqualTo(LocalDateTime.of(2026, 7, 22, 9, 50));
        assertThat(response.members()).hasSize(2);
        assertThat(response.members().get(0).memberId()).isEqualTo(1L);
        assertThat(response.members().get(0).nickname()).isEqualTo("방장");
        assertThat(response.members().get(0).host()).isTrue();
        assertThat(response.members().get(0).completedMissionCount()).isEqualTo(2);
        assertThat(response.members().get(0).joinedAt()).isEqualTo(LocalDateTime.of(2026, 7, 22, 10, 0));
        assertThat(response.members().get(1).memberId()).isEqualTo(2L);
        assertThat(response.members().get(1).nickname()).isEqualTo("참여자");
        assertThat(response.members().get(1).host()).isFalse();
        then(roomMemberRepository).should().findAllByRoomIdOrderByJoinedAtAsc(10L);
    }

    @Test
    @DisplayName("이름이 없는 기존 게임방 상세도 조회할 수 있다")
    void getRoomDetailReturnsNullNameForLegacyRoom() {
        // given
        Room room = room(10L, 1L);
        ReflectionTestUtils.setField(room, "name", null);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L)).willReturn(List.of());

        // when
        RoomDetailResponse response = roomReadService.getRoomDetail(1L, 10L);

        // then
        assertThat(response.name()).isNull();
        assertThat(response.members()).isEmpty();
    }

    @Test
    @DisplayName("존재하지 않는 게임방의 상세를 조회하면 실패한다")
    void getRoomDetailRejectsMissingRoom() {
        // given
        given(roomRepository.findById(10L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(
                () -> roomReadService.getRoomDetail(1L, 10L),
                ErrorCode.ROOM_NOT_FOUND
        );
    }

    @Test
    @DisplayName("게임방 참여자가 아니면 상세 조회에 실패한다")
    void getRoomDetailRejectsNonMember() {
        // given
        Room room = room(10L, 1L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(false);

        // when & then
        assertErrorCode(
                () -> roomReadService.getRoomDetail(2L, 10L),
                ErrorCode.ROOM_MEMBER_FORBIDDEN
        );
    }

    @Test
    @DisplayName("종료된 게임방의 상세를 조회하면 실패한다")
    void getRoomDetailRejectsClosedRoom() {
        // given
        Room room = room(10L, 1L);
        room.close();
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);

        // when & then
        assertErrorCode(
                () -> roomReadService.getRoomDetail(1L, 10L),
                ErrorCode.ROOM_CLOSED
        );
    }

    @Test
    @DisplayName("참여자 회원을 찾을 수 없으면 상세 조회에 실패한다")
    void getRoomDetailRejectsMissingMember() {
        // given
        Room room = room(10L, 1L);
        RoomMember roomMember = roomMember(10L, 1L, 0, LocalDateTime.of(2026, 7, 22, 10, 0));
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L)).willReturn(List.of(roomMember));
        given(memberReadService.getNicknamesByIds(List.of(1L)))
                .willThrow(new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        // when & then
        assertErrorCode(
                () -> roomReadService.getRoomDetail(1L, 10L),
                ErrorCode.MEMBER_NOT_FOUND
        );
    }

    @Test
    @DisplayName("내 게임방 목록을 참여자 닉네임 요약과 함께 반환한다")
    void getMyRoomsReturnsRoomsWithMemberSummaries() {
        // given
        Room activeRoom = room(10L, 1L);
        Room closedRoom = room(20L, 2L);
        closedRoom.close();
        RoomMember myActiveRoomMember = roomMember(
                10L,
                1L,
                0,
                LocalDateTime.of(2026, 7, 22, 10, 0)
        );
        RoomMember myClosedRoomMember = roomMember(
                20L,
                1L,
                0,
                LocalDateTime.of(2026, 7, 22, 9, 0)
        );
        RoomMember guestMember = roomMember(
                10L,
                2L,
                0,
                LocalDateTime.of(2026, 7, 22, 10, 5)
        );
        given(roomMemberRepository.findAllByMemberIdOrderByJoinedAtDesc(1L))
                .willReturn(List.of(myActiveRoomMember, myClosedRoomMember));
        given(roomRepository.findAllById(List.of(10L, 20L)))
                .willReturn(List.of(activeRoom, closedRoom));
        given(roomMemberRepository.findAllByRoomIdInOrderByJoinedAtAsc(List.of(10L)))
                .willReturn(List.of(myActiveRoomMember, guestMember));
        given(memberReadService.getNicknamesByIds(List.of(1L, 2L)))
                .willReturn(Map.of(1L, "방장", 2L, "참여자"));

        // when
        List<MyRoomResponse> responses = roomReadService.getMyRooms(1L);

        // then
        assertThat(responses).hasSize(1);
        MyRoomResponse response = responses.getFirst();
        assertThat(response.roomId()).isEqualTo(10L);
        assertThat(response.name()).isEqualTo("테스트 방");
        assertThat(response.mode()).isEqualTo(GameMode.SINGLE);
        assertThat(response.status()).isEqualTo(GameRoomStatus.CREATED);
        assertThat(response.targetBingoCount()).isNull();
        assertThat(response.hostId()).isEqualTo(1L);
        assertThat(response.joinedAt()).isEqualTo(LocalDateTime.of(2026, 7, 22, 10, 0));
        assertThat(response.members()).hasSize(2);
        assertThat(response.members().get(0).memberId()).isEqualTo(1L);
        assertThat(response.members().get(0).nickname()).isEqualTo("방장");
        assertThat(response.members().get(0).host()).isTrue();
        assertThat(response.members().get(1).memberId()).isEqualTo(2L);
        assertThat(response.members().get(1).nickname()).isEqualTo("참여자");
        assertThat(response.members().get(1).host()).isFalse();
        then(roomMemberRepository).should().findAllByMemberIdOrderByJoinedAtDesc(1L);
    }

    @Test
    @DisplayName("내가 참여한 게임방이 없으면 빈 목록을 반환한다")
    void getMyRoomsReturnsEmptyList() {
        // given
        given(roomMemberRepository.findAllByMemberIdOrderByJoinedAtDesc(1L)).willReturn(List.of());

        // when
        List<MyRoomResponse> responses = roomReadService.getMyRooms(1L);

        // then
        assertThat(responses).isEmpty();
    }

    @Test
    @DisplayName("내가 참여한 게임방이 모두 종료 상태이면 빈 목록을 반환한다")
    void getMyRoomsReturnsEmptyListWhenRoomsAreClosed() {
        // given
        Room closedRoom = room(10L, 1L);
        closedRoom.close();
        RoomMember myRoomMember = roomMember(
                10L,
                1L,
                0,
                LocalDateTime.of(2026, 7, 22, 10, 0)
        );
        given(roomMemberRepository.findAllByMemberIdOrderByJoinedAtDesc(1L))
                .willReturn(List.of(myRoomMember));
        given(roomRepository.findAllById(List.of(10L))).willReturn(List.of(closedRoom));

        // when
        List<MyRoomResponse> responses = roomReadService.getMyRooms(1L);

        // then
        assertThat(responses).isEmpty();
    }

    @Test
    @DisplayName("내가 참여한 게임방을 찾을 수 없으면 내 게임방 목록 조회에 실패한다")
    void getMyRoomsRejectsMissingRoom() {
        // given
        RoomMember myRoomMember = roomMember(
                10L,
                1L,
                0,
                LocalDateTime.of(2026, 7, 22, 10, 0)
        );
        given(roomMemberRepository.findAllByMemberIdOrderByJoinedAtDesc(1L))
                .willReturn(List.of(myRoomMember));
        given(roomRepository.findAllById(List.of(10L))).willReturn(List.of());

        // when & then
        assertErrorCode(
                () -> roomReadService.getMyRooms(1L),
                ErrorCode.ROOM_NOT_FOUND
        );
    }

    @Test
    @DisplayName("참여자 회원을 찾을 수 없으면 내 게임방 목록 조회에 실패한다")
    void getMyRoomsRejectsMissingMember() {
        // given
        Room room = room(10L, 1L);
        RoomMember myRoomMember = roomMember(
                10L,
                1L,
                0,
                LocalDateTime.of(2026, 7, 22, 10, 0)
        );
        given(roomMemberRepository.findAllByMemberIdOrderByJoinedAtDesc(1L))
                .willReturn(List.of(myRoomMember));
        given(roomRepository.findAllById(List.of(10L))).willReturn(List.of(room));
        given(roomMemberRepository.findAllByRoomIdInOrderByJoinedAtAsc(List.of(10L)))
                .willReturn(List.of(myRoomMember));
        given(memberReadService.getNicknamesByIds(List.of(1L)))
                .willThrow(new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        // when & then
        assertErrorCode(
                () -> roomReadService.getMyRooms(1L),
                ErrorCode.MEMBER_NOT_FOUND
        );
    }

    @Test
    @DisplayName("게임방 참여자 목록을 닉네임과 방장 여부를 포함해 반환한다")
    void getRoomMembersReturnsMembersWithNicknamesAndHostFlag() {
        // given
        Room room = room(10L, 1L);
        RoomMember hostMember = roomMember(10L, 1L, 2, LocalDateTime.of(2026, 7, 22, 10, 0));
        RoomMember guestMember = roomMember(10L, 2L, 1, LocalDateTime.of(2026, 7, 22, 10, 5));
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L))
                .willReturn(List.of(hostMember, guestMember));
        given(memberReadService.getNicknamesByIds(List.of(1L, 2L)))
                .willReturn(Map.of(1L, "방장", 2L, "참여자"));

        // when
        List<RoomMemberResponse> responses = roomReadService.getRoomMembers(1L, 10L);

        // then
        assertThat(responses).hasSize(2);
        assertThat(responses.get(0).memberId()).isEqualTo(1L);
        assertThat(responses.get(0).nickname()).isEqualTo("방장");
        assertThat(responses.get(0).host()).isTrue();
        assertThat(responses.get(0).completedMissionCount()).isEqualTo(2);
        assertThat(responses.get(0).joinedAt()).isEqualTo(LocalDateTime.of(2026, 7, 22, 10, 0));
        assertThat(responses.get(1).memberId()).isEqualTo(2L);
        assertThat(responses.get(1).nickname()).isEqualTo("참여자");
        assertThat(responses.get(1).host()).isFalse();
        then(roomMemberRepository).should().findAllByRoomIdOrderByJoinedAtAsc(10L);
    }

    @Test
    @DisplayName("게임방 참여자가 없으면 빈 목록을 반환한다")
    void getRoomMembersReturnsEmptyList() {
        // given
        Room room = room(10L, 1L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L)).willReturn(List.of());

        // when
        List<RoomMemberResponse> responses = roomReadService.getRoomMembers(1L, 10L);

        // then
        assertThat(responses).isEmpty();
    }

    @Test
    @DisplayName("존재하지 않는 게임방의 참여자 목록을 조회하면 실패한다")
    void getRoomMembersRejectsMissingRoom() {
        // given
        given(roomRepository.findById(10L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(
                () -> roomReadService.getRoomMembers(1L, 10L),
                ErrorCode.ROOM_NOT_FOUND
        );
    }

    @Test
    @DisplayName("게임방 참여자가 아니면 참여자 목록 조회에 실패한다")
    void getRoomMembersRejectsNonMember() {
        // given
        Room room = room(10L, 1L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(false);

        // when & then
        assertErrorCode(
                () -> roomReadService.getRoomMembers(2L, 10L),
                ErrorCode.ROOM_MEMBER_FORBIDDEN
        );
    }

    @Test
    @DisplayName("참여자 회원을 찾을 수 없으면 참여자 목록 조회에 실패한다")
    void getRoomMembersRejectsMissingMember() {
        // given
        Room room = room(10L, 1L);
        RoomMember roomMember = roomMember(10L, 1L, 0, LocalDateTime.of(2026, 7, 22, 10, 0));
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L)).willReturn(List.of(roomMember));
        given(memberReadService.getNicknamesByIds(List.of(1L)))
                .willThrow(new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        // when & then
        assertErrorCode(
                () -> roomReadService.getRoomMembers(1L, 10L),
                ErrorCode.MEMBER_NOT_FOUND
        );
    }

    @Test
    @DisplayName("공동 걸음 보상 대상 방의 현재 멤버와 활성 공유 빙고판을 반환한다")
    void getStepGoalRewardTargetsReturnsActiveSharedBoardAndCurrentMembers() {
        // given
        LocalDateTime boardCreatedAt = LocalDateTime.of(2026, 7, 20, 10, 0);
        Room room = Room.create(1L, "테스트 방", GameMode.COOPERATE, null, 10_000, 3);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        RoomMember hostMember = roomMember(10L, 1L, 0, LocalDateTime.of(2026, 7, 20, 9, 0));
        RoomMember guestMember = roomMember(10L, 2L, 0, LocalDateTime.of(2026, 7, 22, 9, 0));
        Game game = Game.start(10L);
        ReflectionTestUtils.setField(game, "id", 20L);
        BingoBoard bingoBoard = BingoBoard.create(20L, 3);
        ReflectionTestUtils.setField(bingoBoard, "id", 30L);
        ReflectionTestUtils.setField(bingoBoard, "createdAt", boardCreatedAt);
        given(roomMemberRepository.findAllByMemberIdOrderByJoinedAtDesc(1L))
                .willReturn(List.of(hostMember));
        given(roomRepository.findAllById(List.of(10L))).willReturn(List.of(room));
        given(gameRepository.findAllByRoomIdInAndStatus(List.of(10L), GameStatus.IN_PROGRESS))
                .willReturn(List.of(game));
        given(bingoBoardRepository.findAllByGameIdInAndStatusNotInOrderByIdAsc(
                List.of(20L),
                List.of(BingoBoardStatus.COMPLETED, BingoBoardStatus.EXPIRED)
        )).willReturn(List.of(bingoBoard));
        given(roomMemberRepository.findAllByRoomIdInOrderByJoinedAtAsc(List.of(10L)))
                .willReturn(List.of(hostMember, guestMember));

        // when
        List<StepGoalRewardTarget> targets = roomReadService.getStepGoalRewardTargets(1L);

        // then
        assertThat(targets).hasSize(1);
        StepGoalRewardTarget target = targets.getFirst();
        assertThat(target.roomId()).isEqualTo(10L);
        assertThat(target.bingoBoardId()).isEqualTo(30L);
        assertThat(target.boardStartedDate()).isEqualTo(boardCreatedAt.toLocalDate());
        assertThat(target.targetStepCount()).isEqualTo(10_000);
        assertThat(target.members())
                .extracting(
                        RoomReadService.StepGoalRewardMember::memberId,
                        RoomReadService.StepGoalRewardMember::joinedDate
                )
                .containsExactly(
                        tuple(1L, LocalDateTime.of(2026, 7, 20, 9, 0).toLocalDate()),
                        tuple(2L, LocalDateTime.of(2026, 7, 22, 9, 0).toLocalDate())
                );
    }

    @Test
    @DisplayName("목표 걸음 수가 없는 기존 방은 공동 걸음 보상 대상에서 제외한다")
    void getStepGoalRewardTargetsSkipsRoomWithoutTargetStepCount() {
        // given
        Room room = Room.create(1L, "테스트 방", GameMode.COOPERATE, null, 3);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        RoomMember roomMember = roomMember(10L, 1L, 0, LocalDateTime.of(2026, 7, 20, 9, 0));
        given(roomMemberRepository.findAllByMemberIdOrderByJoinedAtDesc(1L))
                .willReturn(List.of(roomMember));
        given(roomRepository.findAllById(List.of(10L))).willReturn(List.of(room));

        // when
        List<StepGoalRewardTarget> targets = roomReadService.getStepGoalRewardTargets(1L);

        // then
        assertThat(targets).isEmpty();
        then(gameRepository).shouldHaveNoInteractions();
        then(bingoBoardRepository).shouldHaveNoInteractions();
    }

    private Room room(Long roomId, Long hostId) {
        Room room = Room.create(hostId, "테스트 방", GameMode.SINGLE, null, 3);
        ReflectionTestUtils.setField(room, "id", roomId);
        return room;
    }

    private RoomMember roomMember(
            Long roomId,
            Long memberId,
            int completedMissionCount,
            LocalDateTime joinedAt
    ) {
        RoomMember roomMember = RoomMember.create(roomId, memberId);
        ReflectionTestUtils.setField(roomMember, "completedMissionCount", completedMissionCount);
        ReflectionTestUtils.setField(roomMember, "joinedAt", joinedAt);
        return roomMember;
    }

    private void assertErrorCode(Runnable action, ErrorCode errorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(errorCode);
    }
}
