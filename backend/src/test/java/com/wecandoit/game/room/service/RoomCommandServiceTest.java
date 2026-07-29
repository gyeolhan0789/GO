package com.wecandoit.game.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.bingo.service.BingoCommandService;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.controller.request.CreateRoomRequest;
import com.wecandoit.game.controller.response.CreateRoomResponse;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.RoomCommandService;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.notification.domain.NotificationType;
import com.wecandoit.notification.event.NotificationMessageFactory;
import com.wecandoit.notification.event.NotificationRequestedEvent;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("게임방 서비스")
class RoomCommandServiceTest {

    private static final int DEFAULT_BOARD_SIZE = 3;

    @Mock
    private RoomRepository roomRepository;
    @Mock
    private RoomMemberRepository roomMemberRepository;
    @Mock
    private GameRepository gameRepository;
    @Mock
    private BingoCommandService bingoCommandService;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    private RoomCommandService roomCommandService;

    @BeforeEach
    void setUp() {
        roomCommandService = new RoomCommandService(
                roomRepository,
                roomMemberRepository,
                gameRepository,
                bingoCommandService,
                memberRepository,
                eventPublisher,
                new NotificationMessageFactory()
        );
        AtomicLong gameIdSequence = new AtomicLong(200L);
        Mockito.lenient().when(gameRepository.save(Mockito.any(Game.class))).thenAnswer(invocation -> {
            Game game = invocation.getArgument(0);
            ReflectionTestUtils.setField(game, "id", gameIdSequence.getAndIncrement());
            return game;
        });
    }

    @Test
    @DisplayName("게임방을 생성하면 방과 방장 참여 정보를 저장한다")
    void createRoomSavesRoomAndHostMember() {
        // given
        given(roomRepository.save(Mockito.any(Room.class))).willAnswer(invocation -> {
            Room room = invocation.getArgument(0);
            ReflectionTestUtils.setField(room, "id", 10L);
            return room;
        });

        // when
        CreateRoomResponse response = roomCommandService.createRoom(
                1L,
                new CreateRoomRequest(GameMode.BATTLE, 3, null, 3)
        );

        // then
        ArgumentCaptor<Room> roomCaptor = ArgumentCaptor.forClass(Room.class);
        ArgumentCaptor<RoomMember> roomMemberCaptor = ArgumentCaptor.forClass(RoomMember.class);
        then(roomRepository).should().save(roomCaptor.capture());
        then(roomMemberRepository).should().save(roomMemberCaptor.capture());

        Room room = roomCaptor.getValue();
        assertThat(room.getHostId()).isEqualTo(1L);
        assertThat(room.getMode()).isEqualTo(GameMode.BATTLE);
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.WAITING);
        assertThat(room.getTargetBingoCount()).isEqualTo(3);
        assertThat(room.getBoardSize()).isEqualTo(3);

        RoomMember roomMember = roomMemberCaptor.getValue();
        assertThat(roomMember.getRoomId()).isEqualTo(10L);
        assertThat(roomMember.getMemberId()).isEqualTo(1L);
        assertThat(roomMember.getCompletedMissionCount()).isZero();
        assertThat(roomMember.getJoinedAt()).isNotNull();

        assertThat(response.roomId()).isEqualTo(10L);
        assertThat(response.status()).isEqualTo(GameRoomStatus.WAITING);

    }

    @Test
    @DisplayName("싱글 모드는 목표 빙고 수 없이 게임방을 생성한다")
    void createSingleRoomWithoutTargetBingoCount() {
        // given
        lockMember();
        given(roomRepository.findFirstByMemberIdAndModeAndStatus(
                1L,
                GameMode.SINGLE,
                GameRoomStatus.IN_PROGRESS
        )).willReturn(Optional.empty());
        given(roomRepository.save(Mockito.any(Room.class))).willAnswer(invocation -> {
            Room room = invocation.getArgument(0);
            ReflectionTestUtils.setField(room, "id", 10L);
            return room;
        });

        // when
        CreateRoomResponse response = roomCommandService.createRoom(
                1L,
                new CreateRoomRequest(GameMode.SINGLE, null, 10_000, 3)
        );

        // then
        ArgumentCaptor<Room> roomCaptor = ArgumentCaptor.forClass(Room.class);
        then(roomRepository).should().save(roomCaptor.capture());
        assertThat(roomCaptor.getValue().getTargetBingoCount()).isNull();
        assertThat(roomCaptor.getValue().getTargetStepCount()).isEqualTo(10_000);
        assertThat(roomCaptor.getValue().getStatus()).isEqualTo(GameRoomStatus.IN_PROGRESS);
        then(bingoCommandService).should().generateInitialBoard(roomCaptor.getValue(), 200L);
    }

    @Test
    @DisplayName("진행 중인 개인 방이 있으면 새 방을 만들지 않고 기존 방을 반환한다")
    void createSingleRoomReturnsExistingInProgressRoom() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, null, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        lockMember();
        given(roomRepository.findFirstByMemberIdAndModeAndStatus(
                1L,
                GameMode.SINGLE,
                GameRoomStatus.IN_PROGRESS
        )).willReturn(Optional.of(room));

        // when
        CreateRoomResponse response = roomCommandService.createRoom(
                1L,
                new CreateRoomRequest(GameMode.SINGLE, null, 10_000, DEFAULT_BOARD_SIZE)
        );

        // then
        assertThat(response.roomId()).isEqualTo(10L);
        assertThat(response.status()).isEqualTo(GameRoomStatus.IN_PROGRESS);
        then(roomRepository).should(Mockito.never()).save(Mockito.any(Room.class));
        then(roomMemberRepository).shouldHaveNoInteractions();
        then(bingoCommandService).shouldHaveNoInteractions();
    }

    private void lockMember() {
        given(memberRepository.findByIdForUpdate(1L)).willReturn(Optional.of(Mockito.mock(Member.class)));
    }

    @Test
    @DisplayName("대결 모드에서 목표 빙고 수가 없으면 게임방 생성에 실패한다")
    void createBattleRoomRejectsMissingTargetBingoCount() {
        // when & then
        assertErrorCode(
                () -> roomCommandService.createRoom(
                        1L,
                        new CreateRoomRequest(GameMode.BATTLE, null, null, 3)
                ),
                ErrorCode.ROOM_TARGET_BINGO_COUNT_REQUIRED
        );
        then(roomRepository).should(Mockito.never()).save(Mockito.any(Room.class));
    }

    @Test
    @DisplayName("싱글 모드에서 목표 빙고 수가 있으면 게임방 생성에 실패한다")
    void createSingleRoomRejectsTargetBingoCount() {
        // when & then
        assertErrorCode(
                () -> roomCommandService.createRoom(
                        1L,
                        new CreateRoomRequest(GameMode.SINGLE, 3, 10_000, 3)
                ),
                ErrorCode.ROOM_TARGET_BINGO_COUNT_NOT_ALLOWED
        );
        then(roomRepository).should(Mockito.never()).save(Mockito.any(Room.class));
    }

    @Test
    @DisplayName("대결 모드는 목표 빙고 수를 저장한다")
    void createBattleRoomStoresTargetBingoCount() {
        // given
        given(roomRepository.save(Mockito.any(Room.class))).willAnswer(invocation -> {
            Room room = invocation.getArgument(0);
            ReflectionTestUtils.setField(room, "id", 10L);
            return room;
        });

        // when
        CreateRoomResponse response = roomCommandService.createRoom(
                1L,
                new CreateRoomRequest(GameMode.BATTLE, 3, null, 3)
        );

        // then
        ArgumentCaptor<Room> roomCaptor = ArgumentCaptor.forClass(Room.class);
        then(roomRepository).should().save(roomCaptor.capture());
        assertThat(roomCaptor.getValue().getMode()).isEqualTo(GameMode.BATTLE);
        assertThat(roomCaptor.getValue().getTargetBingoCount()).isEqualTo(3);
    }

    @Test
    @DisplayName("협동 모드에서 목표 빙고 수가 있으면 게임방 생성에 실패한다")
    void createCooperateRoomRejectsTargetBingoCount() {
        // when & then
        assertErrorCode(
                () -> roomCommandService.createRoom(
                        1L,
                        new CreateRoomRequest(GameMode.COOPERATE, 3, 10_000, 3)
                ),
                ErrorCode.ROOM_TARGET_BINGO_COUNT_NOT_ALLOWED
        );
        then(roomRepository).should(Mockito.never()).save(Mockito.any(Room.class));
    }

    @Test
    @DisplayName("싱글 모드에서 목표 걸음 수가 없으면 게임방 생성에 실패한다")
    void createSingleRoomRejectsMissingTargetStepCount() {
        // when & then
        assertErrorCode(
                () -> roomCommandService.createRoom(
                        1L,
                        new CreateRoomRequest(GameMode.SINGLE, null, null, 3)
                ),
                ErrorCode.ROOM_TARGET_STEP_COUNT_REQUIRED
        );
        then(roomRepository).should(Mockito.never()).save(Mockito.any(Room.class));
    }

    @Test
    @DisplayName("협동 모드에서 목표 걸음 수가 1 미만이면 게임방 생성에 실패한다")
    void createCooperateRoomRejectsInvalidTargetStepCount() {
        // when & then
        assertErrorCode(
                () -> roomCommandService.createRoom(
                        1L,
                        new CreateRoomRequest(GameMode.COOPERATE, null, 0, 3)
                ),
                ErrorCode.ROOM_TARGET_STEP_COUNT_REQUIRED
        );
        then(roomRepository).should(Mockito.never()).save(Mockito.any(Room.class));
    }

    @Test
    @DisplayName("대결 모드에서 목표 걸음 수가 있으면 게임방 생성에 실패한다")
    void createBattleRoomRejectsTargetStepCount() {
        // when & then
        assertErrorCode(
                () -> roomCommandService.createRoom(
                        1L,
                        new CreateRoomRequest(GameMode.BATTLE, 3, 10_000, 3)
                ),
                ErrorCode.ROOM_TARGET_STEP_COUNT_NOT_ALLOWED
        );
        then(roomRepository).should(Mockito.never()).save(Mockito.any(Room.class));
    }

    @Test
    @DisplayName("방장이 게임방을 삭제하면 게임방 상태를 종료로 변경한다")
    void deleteRoomClosesRoom() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, null, 3);
        ReflectionTestUtils.setField(room, "id", 10L);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));

        // when
        roomCommandService.deleteRoom(1L, 10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.CLOSED);
        then(roomMemberRepository).should(Mockito.never()).deleteAllByRoomId(10L);
    }

    @Test
    @DisplayName("협동 방을 삭제하면 참여자 정보를 모두 제거한다")
    void deleteCooperateRoomDeletesMembers() {
        // given
        Room room = Room.create(1L, GameMode.COOPERATE, null, 3);
        ReflectionTestUtils.setField(room, "id", 10L);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));

        // when
        roomCommandService.deleteRoom(1L, 10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.CLOSED);
        then(roomMemberRepository).should().deleteAllByRoomId(10L);
    }

    @Test
    @DisplayName("존재하지 않는 게임방을 삭제하면 실패한다")
    void deleteRoomRejectsMissingRoom() {
        // given
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(
                () -> roomCommandService.deleteRoom(1L, 10L),
                ErrorCode.ROOM_NOT_FOUND
        );
    }

    @Test
    @DisplayName("방장이 아닌 회원이 게임방을 삭제하면 실패한다")
    void deleteRoomRejectsNonHost() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, null, 3);
        ReflectionTestUtils.setField(room, "id", 10L);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));

        // when & then
        assertErrorCode(
                () -> roomCommandService.deleteRoom(2L, 10L),
                ErrorCode.ROOM_DELETE_FORBIDDEN
        );
    }

    @Test
    @DisplayName("일반 참여자가 게임방을 나가면 본인 참여 정보만 삭제한다")
    void leaveRoomDeletesMemberOnly() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, null, DEFAULT_BOARD_SIZE);
        RoomMember roomMember = RoomMember.create(10L, 2L);
        ReflectionTestUtils.setField(room, "id", 10L);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.findByRoomIdAndMemberId(10L, 2L)).willReturn(Optional.of(roomMember));

        // when
        roomCommandService.leaveRoom(2L, 10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.CREATED);
        then(roomMemberRepository).should().delete(roomMember);
        then(roomMemberRepository).should(Mockito.never()).deleteAllByRoomId(10L);
    }

    @Test
    @DisplayName("협동 방의 참여자가 나가 최소 인원 미만이 되면 WAITING 상태로 전이한다")
    void leaveCooperateRoomTransitionsReadyRoomToWaiting() {
        // given
        Room room = Room.create(1L, GameMode.COOPERATE, null, DEFAULT_BOARD_SIZE);
        RoomMember roomMember = RoomMember.create(10L, 2L);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.READY);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.findByRoomIdAndMemberId(10L, 2L)).willReturn(Optional.of(roomMember));
        given(roomMemberRepository.countByRoomId(10L)).willReturn(2L);

        // when
        roomCommandService.leaveRoom(2L, 10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.WAITING);
        then(roomMemberRepository).should().delete(roomMember);
    }

    @Test
    @DisplayName("진행 중인 협동 방에서 참여자가 나가도 WAITING 상태로 되돌아가지 않는다")
    void leaveInProgressCooperateRoomKeepsInProgressStatus() {
        // given
        Room room = Room.create(1L, GameMode.COOPERATE, null, DEFAULT_BOARD_SIZE);
        RoomMember roomMember = RoomMember.create(10L, 2L);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.findByRoomIdAndMemberId(10L, 2L)).willReturn(Optional.of(roomMember));
        given(roomMemberRepository.countByRoomId(10L)).willReturn(2L);

        // when
        roomCommandService.leaveRoom(2L, 10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.IN_PROGRESS);
        then(roomMemberRepository).should().delete(roomMember);
    }

    @Test
    @DisplayName("방장이 게임방을 나가면 게임방을 종료하고 참여자 정보를 모두 삭제한다")
    void leaveRoomByHostClosesRoomAndDeletesMembers() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, null, DEFAULT_BOARD_SIZE);
        RoomMember roomMember = RoomMember.create(10L, 1L);
        ReflectionTestUtils.setField(room, "id", 10L);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.findByRoomIdAndMemberId(10L, 1L)).willReturn(Optional.of(roomMember));

        // when
        roomCommandService.leaveRoom(1L, 10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.CLOSED);
        then(roomMemberRepository).should().deleteAllByRoomId(10L);
        then(roomMemberRepository).should(Mockito.never()).delete(Mockito.any(RoomMember.class));
    }

    @Test
    @DisplayName("존재하지 않는 게임방을 나가면 실패한다")
    void leaveRoomRejectsMissingRoom() {
        // given
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(
                () -> roomCommandService.leaveRoom(1L, 10L),
                ErrorCode.ROOM_NOT_FOUND
        );
    }

    @Test
    @DisplayName("종료된 게임방을 나가면 실패한다")
    void leaveRoomRejectsClosedRoom() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, null, DEFAULT_BOARD_SIZE);
        room.close();
        ReflectionTestUtils.setField(room, "id", 10L);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));

        // when & then
        assertErrorCode(
                () -> roomCommandService.leaveRoom(1L, 10L),
                ErrorCode.ROOM_CLOSED
        );
    }

    @Test
    @DisplayName("게임방 참여자가 아니면 나가기에 실패한다")
    void leaveRoomRejectsNonMember() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, null, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.findByRoomIdAndMemberId(10L, 2L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(
                () -> roomCommandService.leaveRoom(2L, 10L),
                ErrorCode.ROOM_MEMBER_FORBIDDEN
        );
    }

    @Test
    @DisplayName("방장이 READY 상태의 게임방에서 게임을 시작하면 IN_PROGRESS로 전이하고 시작 시각을 기록한다")
    void startGameTransitionsReadyRoomToInProgress() {
        // given
        Room room = Room.create(1L, GameMode.COOPERATE, null, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.READY);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.countByRoomId(10L)).willReturn(2L);

        // when
        roomCommandService.startGame(1L, 10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.IN_PROGRESS);
        assertThat(room.getStartedAt()).isNotNull();
        then(bingoCommandService).should().generateInitialBoard(room, 200L);
    }

    @Test
    void startGameCreatesASeparateGameForEachRoundInTheSameRoom() {
        Room room = Room.create(1L, GameMode.COOPERATE, null, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.READY);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.countByRoomId(10L)).willReturn(2L);

        roomCommandService.startGame(1L, 10L);
        room.finishGame(2L);
        roomCommandService.startGame(1L, 10L);

        ArgumentCaptor<Game> gameCaptor = ArgumentCaptor.forClass(Game.class);
        then(gameRepository).should(Mockito.times(2)).save(gameCaptor.capture());
        assertThat(gameCaptor.getAllValues())
                .extracting(Game::getId)
                .containsExactly(200L, 201L);
        assertThat(gameCaptor.getAllValues())
                .extracting(Game::getRoomId)
                .containsOnly(10L);
        then(bingoCommandService).should().generateInitialBoard(room, 200L);
        then(bingoCommandService).should().generateInitialBoard(room, 201L);
    }

    @Test
    @DisplayName("대결 방을 시작하면 두 참가자의 개인 빙고판을 생성한다")
    void startBattleGameGeneratesBoardsForBothParticipants() {
        // given
        Room room = Room.create(1L, GameMode.BATTLE, 3, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.READY);
        RoomMember hostMember = RoomMember.create(10L, 1L);
        RoomMember guestMember = RoomMember.create(10L, 2L);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.countByRoomId(10L)).willReturn(2L);
        given(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L))
                .willReturn(List.of(hostMember, guestMember));

        // when
        roomCommandService.startGame(1L, 10L);

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.IN_PROGRESS);
        then(bingoCommandService).should().generateBattleBoards(room, 200L, List.of(hostMember, guestMember));
        then(bingoCommandService).should(Mockito.never())
                .generateInitialBoard(Mockito.any(Room.class), Mockito.anyLong());
    }

    @Test
    @DisplayName("참가자가 한 명인 대결 방은 시작할 수 없다")
    void startBattleGameRejectsOneParticipant() {
        // given
        Room room = Room.create(1L, GameMode.BATTLE, 3, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.WAITING);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.countByRoomId(10L)).willReturn(1L);

        // when & then
        assertErrorCode(
                () -> roomCommandService.startGame(1L, 10L),
                ErrorCode.ROOM_MINIMUM_PARTICIPANTS_REQUIRED
        );
        then(bingoCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("목표 빙고 수가 없는 대결 방은 시작할 수 없다")
    void startBattleGameRejectsMissingTargetBingoCount() {
        // given
        Room room = Room.create(1L, GameMode.BATTLE, null, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.READY);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);

        // when & then
        assertErrorCode(
                () -> roomCommandService.startGame(1L, 10L),
                ErrorCode.ROOM_TARGET_BINGO_COUNT_REQUIRED
        );
        then(bingoCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("참가자가 세 명인 대결 방은 시작할 수 없다")
    void startBattleGameRejectsThreeParticipants() {
        // given
        Room room = Room.create(1L, GameMode.BATTLE, 3, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.READY);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.countByRoomId(10L)).willReturn(3L);

        // when & then
        assertErrorCode(
                () -> roomCommandService.startGame(1L, 10L),
                ErrorCode.ROOM_MAXIMUM_PARTICIPANTS_REACHED
        );
        then(bingoCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("이미 시작된 대결 방은 재시작해도 개인 빙고판을 추가 생성하지 않는다")
    void startBattleGameRejectsDuplicateRequest() {
        // given
        Room room = Room.create(1L, GameMode.BATTLE, 3, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.countByRoomId(10L)).willReturn(2L);

        // when & then
        assertErrorCode(
                () -> roomCommandService.startGame(1L, 10L),
                ErrorCode.ROOM_NOT_READY
        );
        then(bingoCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("게임을 시작하면 host를 제외한 방 멤버 전원에게 WALK_START 알림 이벤트가 발행된다")
    void startGamePublishesNotificationEventToNonHostMembers() {
        // given
        Room room = Room.create(1L, GameMode.COOPERATE, null, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.READY);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.countByRoomId(10L)).willReturn(3L);
        given(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L)).willReturn(List.of(
                RoomMember.create(10L, 1L),
                RoomMember.create(10L, 2L),
                RoomMember.create(10L, 3L)
        ));

        // when
        roomCommandService.startGame(1L, 10L);

        // then
        ArgumentCaptor<NotificationRequestedEvent> captor =
                ArgumentCaptor.forClass(NotificationRequestedEvent.class);
        then(eventPublisher).should(Mockito.times(2)).publishEvent(captor.capture());
        List<Long> recipients = captor.getAllValues().stream()
                .map(NotificationRequestedEvent::recipientMemberId)
                .toList();
        assertThat(recipients).containsExactlyInAnyOrder(2L, 3L);
        assertThat(captor.getAllValues())
                .allMatch(event -> event.type() == NotificationType.WALK_START);
    }

    @Test
    @DisplayName("7일 이상 진행한 싱글 방은 만료되어 종료된다")
    void expireSingleRoomClosesExpiredSingleRoom() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, null, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        ReflectionTestUtils.setField(room, "startedAt", LocalDateTime.of(2026, 7, 20, 12, 0));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));

        // when
        roomCommandService.expireSingleRoom(10L, LocalDateTime.of(2026, 7, 20, 12, 0));

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.CLOSED);
        then(roomMemberRepository).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("만료 기준보다 최근인 싱글 방은 유지한다")
    void expireSingleRoomKeepsRecentSingleRoom() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, null, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        ReflectionTestUtils.setField(room, "startedAt", LocalDateTime.of(2026, 7, 20, 12, 1));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));

        // when
        roomCommandService.expireSingleRoom(10L, LocalDateTime.of(2026, 7, 20, 12, 0));

        // then
        assertThat(room.getStatus()).isEqualTo(GameRoomStatus.IN_PROGRESS);
    }

    @Test
    @DisplayName("존재하지 않는 게임방에서 게임을 시작하면 실패한다")
    void startGameRejectsMissingRoom() {
        // given
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(
                () -> roomCommandService.startGame(1L, 10L),
                ErrorCode.ROOM_NOT_FOUND
        );
        then(bingoCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("방장이 아닌 회원이 게임을 시작하면 실패한다")
    void startGameRejectsNonHost() {
        // given
        Room room = Room.create(1L, GameMode.COOPERATE, null, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.READY);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(true);

        // when & then
        assertErrorCode(
                () -> roomCommandService.startGame(2L, 10L),
                ErrorCode.ROOM_START_FORBIDDEN
        );
        then(bingoCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("READY 상태가 아닌 게임방에서 게임을 시작하면 실패한다")
    void startGameRejectsRoomNotReady() {
        // given
        Room room = Room.create(1L, GameMode.COOPERATE, null, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.IN_PROGRESS);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.countByRoomId(10L)).willReturn(2L);

        // when & then
        assertErrorCode(
                () -> roomCommandService.startGame(1L, 10L),
                ErrorCode.ROOM_NOT_READY
        );
        then(bingoCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("게임방 참여자가 아니면 게임을 시작할 수 없다")
    void startGameRejectsNonMember() {
        // given
        Room room = Room.create(1L, GameMode.COOPERATE, null, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.READY);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(false);

        // when & then
        assertErrorCode(
                () -> roomCommandService.startGame(1L, 10L),
                ErrorCode.ROOM_MEMBER_FORBIDDEN
        );
        then(bingoCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("종료된 게임방에서는 게임을 시작할 수 없다")
    void startGameRejectsClosedRoom() {
        // given
        Room room = Room.create(1L, GameMode.COOPERATE, null, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        room.close();
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));

        // when & then
        assertErrorCode(
                () -> roomCommandService.startGame(1L, 10L),
                ErrorCode.ROOM_CLOSED
        );
        then(bingoCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("협동 방의 최소 인원이 충족되지 않으면 게임을 시작할 수 없다")
    void startGameRejectsInsufficientParticipants() {
        // given
        Room room = Room.create(1L, GameMode.COOPERATE, null, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.WAITING);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.countByRoomId(10L)).willReturn(1L);

        // when & then
        assertErrorCode(
                () -> roomCommandService.startGame(1L, 10L),
                ErrorCode.ROOM_MINIMUM_PARTICIPANTS_REQUIRED
        );
        then(bingoCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("최대 인원을 초과한 협동 방은 게임을 시작할 수 없다")
    void startGameRejectsTooManyParticipants() {
        // given
        Room room = Room.create(1L, GameMode.COOPERATE, null, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.READY);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.countByRoomId(10L)).willReturn(5L);

        // when & then
        assertErrorCode(
                () -> roomCommandService.startGame(1L, 10L),
                ErrorCode.ROOM_MAXIMUM_PARTICIPANTS_REACHED
        );
        then(bingoCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("동일한 게임방에 시작 요청이 연속으로 들어오면 빙고판은 한 번만 생성한다")
    void startGameGeneratesBoardOnlyOnceForDuplicateRequests() {
        // given
        Room room = Room.create(1L, GameMode.COOPERATE, null, DEFAULT_BOARD_SIZE);
        ReflectionTestUtils.setField(room, "id", 10L);
        ReflectionTestUtils.setField(room, "status", GameRoomStatus.READY);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(roomMemberRepository.countByRoomId(10L)).willReturn(2L);

        // when
        roomCommandService.startGame(1L, 10L);

        // then
        assertErrorCode(
                () -> roomCommandService.startGame(1L, 10L),
                ErrorCode.ROOM_NOT_READY
        );
        then(bingoCommandService).should().generateInitialBoard(room, 200L);
    }

    private void assertErrorCode(Runnable action, ErrorCode errorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(errorCode);
    }
}
