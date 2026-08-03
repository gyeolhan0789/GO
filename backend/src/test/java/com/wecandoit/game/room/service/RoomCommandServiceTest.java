package com.wecandoit.game.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.controller.request.CreateRoomRequest;
import com.wecandoit.game.controller.request.UpdateRoomNameRequest;
import com.wecandoit.game.controller.response.CreateRoomResponse;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.GameCycleCommandService;
import com.wecandoit.game.service.RoomCommandService;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("게임방 명령 서비스")
class RoomCommandServiceTest {

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private RoomMemberRepository roomMemberRepository;

    @Mock
    private GameRepository gameRepository;

    @Mock
    private BingoBoardRepository bingoBoardRepository;

    @Mock
    private GameCycleCommandService gameCycleCommandService;

    @Mock
    private MemberRepository memberRepository;

    private RoomCommandService roomCommandService;

    @BeforeEach
    void setUp() {
        roomCommandService = new RoomCommandService(
                roomRepository,
                roomMemberRepository,
                gameRepository,
                bingoBoardRepository,
                gameCycleCommandService,
                memberRepository
        );
    }

    @Test
    @DisplayName("협동 방 생성 시 방과 방장을 저장하고 첫 공유 회차를 시작한다")
    void createCooperateRoomStartsSharedCycle() {
        given(memberRepository.existsById(1L)).willReturn(true);
        given(roomRepository.save(any(Room.class))).willAnswer(invocation -> {
            Room room = invocation.getArgument(0);
            ReflectionTestUtils.setField(room, "id", 10L);
            return room;
        });
        RoomMember host = RoomMember.create(10L, 1L);
        given(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L))
                .willReturn(List.of(host));

        CreateRoomResponse response = roomCommandService.createRoom(
                1L,
                new CreateRoomRequest("협동 방", GameMode.COOPERATE, 3, 12_000, 4)
        );

        ArgumentCaptor<Room> roomCaptor = ArgumentCaptor.forClass(Room.class);
        then(roomRepository).should().save(roomCaptor.capture());
        Room room = roomCaptor.getValue();
        assertThat(room.getStatus()).isEqualTo(RoomStatus.ACTIVE);
        assertThat(room.getBoardSize()).isEqualTo(4);
        assertThat(room.getTargetBingoCount()).isNull();
        assertThat(room.getTargetStepCount()).isEqualTo(12_000);
        assertThat(response.roomId()).isEqualTo(10L);
        then(gameCycleCommandService).should()
                .startInitialSharedCycle(room, List.of(host));
    }

    @Test
    @DisplayName("대결 방 생성 시 첫 회차를 만들지 않는다")
    void createBattleRoomWaitsForSecondMember() {
        given(memberRepository.existsById(1L)).willReturn(true);
        given(roomRepository.save(any(Room.class))).willAnswer(invocation -> {
            Room room = invocation.getArgument(0);
            ReflectionTestUtils.setField(room, "id", 10L);
            return room;
        });

        roomCommandService.createRoom(
                1L,
                new CreateRoomRequest("대결 방", GameMode.BATTLE, 3, null, 3)
        );

        then(gameCycleCommandService).shouldHaveNoInteractions();
        then(roomMemberRepository).should().save(argThat(
                member -> member.getRoomId().equals(10L) && member.getMemberId().equals(1L)
        ));
    }

    @Test
    @DisplayName("활성 SINGLE 회차가 만료됐어도 기존 방을 반환한다")
    void createSingleRoomReturnsExistingActiveRoom() {
        Room existingRoom = room(10L, 1L, GameMode.SINGLE);
        Game activeGame = Game.start(10L);
        ReflectionTestUtils.setField(activeGame, "id", 100L);
        ReflectionTestUtils.setField(activeGame, "startedAt", LocalDateTime.now().minusDays(8));
        given(memberRepository.findByIdForUpdate(1L))
                .willReturn(Optional.of(Member.create(
                        "host@example.com",
                        "encoded-password",
                        "host"
                )));
        given(roomRepository.findFirstByHostIdAndModeAndStatusOrderByIdDesc(
                1L, GameMode.SINGLE, RoomStatus.ACTIVE
        )).willReturn(Optional.of(existingRoom));
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(
                10L, GameStatus.ACTIVE
        )).willReturn(Optional.of(activeGame));
        given(bingoBoardRepository.existsByGameIdAndStatus(100L, BingoBoardStatus.ACTIVE))
                .willReturn(true);

        CreateRoomResponse response = roomCommandService.createRoom(
                1L,
                new CreateRoomRequest("새 방", GameMode.SINGLE, 2, 10_000, 3)
        );

        assertThat(response.roomId()).isEqualTo(10L);
        then(roomRepository).should(never()).save(any(Room.class));
        then(gameCycleCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("활성 SINGLE 방의 게임이 없으면 새 방을 만들지 않는다")
    void createSingleRoomRejectsMissingActiveGame() {
        Room existingRoom = room(10L, 1L, GameMode.SINGLE);
        given(memberRepository.findByIdForUpdate(1L))
                .willReturn(Optional.of(Member.create(
                        "host@example.com",
                        "encoded-password",
                        "host"
                )));
        given(roomRepository.findFirstByHostIdAndModeAndStatusOrderByIdDesc(
                1L, GameMode.SINGLE, RoomStatus.ACTIVE
        )).willReturn(Optional.of(existingRoom));
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(
                10L, GameStatus.ACTIVE
        )).willReturn(Optional.empty());

        assertThatThrownBy(() -> roomCommandService.createRoom(
                1L,
                new CreateRoomRequest("새 방", GameMode.SINGLE, 2, 10_000, 3)
        ))
                .isInstanceOf(CustomException.class)
                .extracting(exception -> ((CustomException) exception).getErrorCode())
                .isEqualTo(ErrorCode.ROOM_CYCLE_INVALID);

        then(roomRepository).should(never()).save(any(Room.class));
    }

    @Test
    @DisplayName("활성 SINGLE 방의 빙고판이 없으면 새 방을 만들지 않는다")
    void createSingleRoomRejectsMissingActiveBoard() {
        Room existingRoom = room(10L, 1L, GameMode.SINGLE);
        Game activeGame = Game.start(10L);
        ReflectionTestUtils.setField(activeGame, "id", 100L);
        given(memberRepository.findByIdForUpdate(1L))
                .willReturn(Optional.of(Member.create(
                        "host@example.com",
                        "encoded-password",
                        "host"
                )));
        given(roomRepository.findFirstByHostIdAndModeAndStatusOrderByIdDesc(
                1L, GameMode.SINGLE, RoomStatus.ACTIVE
        )).willReturn(Optional.of(existingRoom));
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(
                10L, GameStatus.ACTIVE
        )).willReturn(Optional.of(activeGame));
        given(bingoBoardRepository.existsByGameIdAndStatus(100L, BingoBoardStatus.ACTIVE))
                .willReturn(false);

        assertThatThrownBy(() -> roomCommandService.createRoom(
                1L,
                new CreateRoomRequest("새 방", GameMode.SINGLE, 2, 10_000, 3)
        ))
                .isInstanceOf(CustomException.class)
                .extracting(exception -> ((CustomException) exception).getErrorCode())
                .isEqualTo(ErrorCode.ROOM_CYCLE_INVALID);

        then(roomRepository).should(never()).save(any(Room.class));
    }

    @Test
    @DisplayName("존재하지 않는 회원은 협동 방을 생성할 수 없다")
    void createCooperateRoomRejectsMissingMember() {
        given(memberRepository.existsById(1L)).willReturn(false);

        assertThatThrownBy(() -> roomCommandService.createRoom(
                1L,
                new CreateRoomRequest("협동 방", GameMode.COOPERATE, 2, 10_000, 3)
        ))
                .isInstanceOf(CustomException.class)
                .extracting(exception -> ((CustomException) exception).getErrorCode())
                .isEqualTo(ErrorCode.MEMBER_NOT_FOUND);

        then(roomRepository).should(never()).save(any(Room.class));
    }

    @Test
    @DisplayName("대결 모드에서 판 크기에 비해 목표 빙고 수가 크면 생성하지 않는다")
    void createRoomRejectsInvalidTargetBingoCount() {
        assertThatThrownBy(() -> roomCommandService.createRoom(
                1L,
                new CreateRoomRequest("잘못된 방", GameMode.BATTLE, 9, null, 3)
        ))
                .isInstanceOf(CustomException.class)
                .extracting(exception -> ((CustomException) exception).getErrorCode())
                .isEqualTo(ErrorCode.BINGO_TARGET_COUNT_INVALID);
    }

    @Test
    @DisplayName("대결 모드에 목표 빙고 수가 없으면 생성하지 않는다")
    void createBattleRoomRejectsMissingTargetBingoCount() {
        assertThatThrownBy(() -> roomCommandService.createRoom(
                1L,
                new CreateRoomRequest("잘못된 방", GameMode.BATTLE, null, null, 3)
        ))
                .isInstanceOf(CustomException.class)
                .extracting(exception -> ((CustomException) exception).getErrorCode())
                .isEqualTo(ErrorCode.BINGO_TARGET_COUNT_INVALID);
    }

    @Test
    @DisplayName("공유 모드에 목표 걸음 수가 없으면 생성하지 않는다")
    void createSharedRoomRejectsMissingTargetStepCount() {
        assertThatThrownBy(() -> roomCommandService.createRoom(
                1L,
                new CreateRoomRequest("잘못된 방", GameMode.COOPERATE, 3, null, 3)
        ))
                .isInstanceOf(CustomException.class)
                .extracting(exception -> ((CustomException) exception).getErrorCode())
                .isEqualTo(ErrorCode.ROOM_TARGET_STEP_COUNT_REQUIRED);
    }

    @Test
    @DisplayName("방장이 아닌 공유 참여자가 나가면 현재 멤버만 삭제한다")
    void leaveSharedRoomDeletesOnlyRoomMember() {
        Room room = room(10L, 1L, GameMode.COOPERATE);
        RoomMember guest = RoomMember.create(10L, 2L);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.findByRoomIdAndMemberId(10L, 2L))
                .willReturn(Optional.of(guest));

        roomCommandService.leaveRoom(2L, 10L);

        then(roomMemberRepository).should().delete(guest);
        then(gameCycleCommandService).shouldHaveNoInteractions();
        assertThat(room.getStatus()).isEqualTo(RoomStatus.ACTIVE);
    }

    @Test
    @DisplayName("대결 참여자가 나가면 기권 결과를 만든 후 현재 멤버를 삭제한다")
    void leaveBattleRoomCompletesForfeit() {
        Room room = room(10L, 1L, GameMode.BATTLE);
        RoomMember guest = RoomMember.create(10L, 2L);
        Game game = Game.start(10L);
        ReflectionTestUtils.setField(game, "id", 100L);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.findByRoomIdAndMemberId(10L, 2L))
                .willReturn(Optional.of(guest));
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(
                10L, GameStatus.ACTIVE
        )).willReturn(Optional.of(game));

        roomCommandService.leaveRoom(2L, 10L);

        then(gameCycleCommandService).should()
                .completeBattleByForfeit(room, 100L, 2L);
        then(roomMemberRepository).should().delete(guest);
    }

    @Test
    @DisplayName("방장이 나가면 활성 회차를 종료하고 방을 닫는다")
    void hostLeaveClosesRoom() {
        Room room = room(10L, 1L, GameMode.COOPERATE);
        RoomMember host = RoomMember.create(10L, 1L);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.findByRoomIdAndMemberId(10L, 1L))
                .willReturn(Optional.of(host));

        roomCommandService.leaveRoom(1L, 10L);

        then(gameCycleCommandService).should().closeActiveCycle(room, 1L);
        then(roomMemberRepository).should().deleteAllByRoomId(10L);
        assertThat(room.getStatus()).isEqualTo(RoomStatus.CLOSED);
    }

    @Test
    @DisplayName("방장만 활성 방 이름을 변경할 수 있다")
    void updateRoomName() {
        Room room = room(10L, 1L, GameMode.COOPERATE);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));

        roomCommandService.updateRoomName(1L, 10L, new UpdateRoomNameRequest("새 이름"));

        assertThat(room.getName()).isEqualTo("새 이름");
    }

    private Room room(Long roomId, Long hostId, GameMode mode) {
        Integer targetStepCount = mode == GameMode.BATTLE ? null : 10_000;
        Room room = Room.create(hostId, "테스트 방", mode, 2, targetStepCount, 3);
        ReflectionTestUtils.setField(room, "id", roomId);
        return room;
    }
}
