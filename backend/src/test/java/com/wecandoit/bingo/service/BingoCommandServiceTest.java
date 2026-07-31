package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.bingo.controller.response.BingoBoardResponse;
import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.GameCycleCommandService;
import com.wecandoit.notification.event.NotificationMessageFactory;
import com.wecandoit.notification.repository.NotificationRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("빙고판 명령 서비스")
class BingoCommandServiceTest {

    private static final List<BingoBoardStatus> INACTIVE_STATUSES =
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
    private BingoBoardRepository bingoBoardRepository;
    @Mock
    private BingoCellRepository bingoCellRepository;
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

    @Test
    @DisplayName("활성 공유 회차의 셀을 제출하면 제출자와 제출 시각을 기록한다")
    void submitCellRecordsSubmission() {
        Room room = room(10L);
        Game game = game(20L, LocalDateTime.now());
        BingoBoard board = board(30L, game.getId());
        BingoCell cell = BingoCell.create(board.getId(), 40L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", 50L);
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(
                10L,
                GameStatus.ACTIVE
        )).willReturn(Optional.of(game));
        given(bingoBoardRepository.findActiveBoardForUpdate(game.getId(), INACTIVE_STATUSES))
                .willReturn(Optional.of(board));
        given(bingoCellRepository.findByIdForUpdate(50L)).willReturn(Optional.of(cell));
        given(bingoCellRepository.save(cell)).willReturn(cell);

        BingoCell result = bingoCommandService.submitCell(1L, 10L, 50L, "https://submit.test/image");

        assertThat(result.getMemberId()).isEqualTo(1L);
        assertThat(result.getSubmittedAt()).isNotNull();
        assertThat(result.getSubmitUrl()).isEqualTo("https://submit.test/image");
    }

    @Test
    @DisplayName("공유 회차 시작 후 7일이 지나면 새 제출을 거부한다")
    void submitCellRejectsExpiredSharedCycle() {
        Room room = room(10L);
        Game game = game(20L, LocalDateTime.now().minusDays(8));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(
                10L,
                GameStatus.ACTIVE
        )).willReturn(Optional.of(game));

        assertThatThrownBy(() -> bingoCommandService.submitCell(
                1L,
                10L,
                50L,
                "https://submit.test/image"
        ))
                .isInstanceOf(CustomException.class)
                .extracting(exception -> ((CustomException) exception).getErrorCode())
                .isEqualTo(ErrorCode.BINGO_BOARD_RENEWAL_REQUIRED);
    }

    @Test
    @DisplayName("빙고판 갱신 설정 세 값을 회차 서비스에 전달한다")
    void renewBoardDelegatesAllSettings() {
        BingoBoardResponse expected = new BingoBoardResponse(
                30L,
                20L,
                10L,
                4,
                3,
                12_000,
                0,
                0,
                0,
                BingoBoardStatus.ACTIVE,
                List.of(),
                false,
                false,
                false,
                null,
                null
        );
        given(gameCycleCommandService.renewSharedCycle(1L, 10L, 4, 3, 12_000))
                .willReturn(expected);

        BingoBoardResponse result = bingoCommandService.renewBoard(1L, 10L, 4, 3, 12_000);

        assertThat(result).isSameAs(expected);
    }

    @Test
    @DisplayName("대결 재대결 요청을 회차 서비스에 위임한다")
    void rematchBattleDelegates() {
        bingoCommandService.rematchBattle(1L, 10L);

        then(gameCycleCommandService).should().rematchBattle(1L, 10L);
    }

    private Room room(Long roomId) {
        Room room = Room.create(1L, "공유 방", GameMode.COOPERATE, 2, 10_000, 3);
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
        BingoBoard board = BingoBoard.create(gameId, 3, 2, 10_000);
        ReflectionTestUtils.setField(board, "id", boardId);
        return board;
    }
}
