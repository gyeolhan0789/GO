package com.wecandoit.bingo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
import com.wecandoit.common.storage.ImageUploadService;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.GameCycleCommandService;
import com.wecandoit.history.domain.ActiveWalkSession;
import com.wecandoit.history.repository.ActiveWalkSessionRepository;
import com.wecandoit.history.repository.WalkSessionRepository;
import com.wecandoit.notification.event.NotificationMessageFactory;
import com.wecandoit.notification.repository.NotificationRepository;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

@ExtendWith(MockitoExtension.class)
@DisplayName("빙고판 명령 서비스")
class BingoCommandServiceTest {

    private static final String STORED_SUBMIT_URL = "/uploads/test/bingo-cells/1000/stored.png";

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
    private ActiveWalkSessionRepository activeWalkSessionRepository;
    @Mock
    private WalkSessionRepository walkSessionRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private ImageUploadService imageUploadService;
    @Mock
    private GameCycleCommandService gameCycleCommandService;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private NotificationMessageFactory notificationMessageFactory;
    @InjectMocks
    private BingoCommandService bingoCommandService;

    @Test
    @DisplayName("활성 빙고 셀을 제출하면 제출자와 제출 시각과 이미지 URL을 기록한다")
    void submitCellRecordsSubmission() {
        // given
        Room room = room(10L);
        Game game = game(20L, LocalDateTime.now());
        BingoBoard board = board(30L, game.getId());
        BingoCell cell = BingoCell.create(board.getId(), 40L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", 50L);
        givenSubmissionContext(room, game, board, cell);
        given(bingoCellRepository.save(cell)).willReturn(cell);
        given(imageUploadService.upload(any(MultipartFile.class), eq("bingo-cells"), anyString()))
                .willReturn(STORED_SUBMIT_URL);

        // when
        BingoCell result = bingoCommandService.submitCell(1L, 10L, 50L, image());

        // then
        assertThat(result.getMemberId()).isEqualTo(1L);
        assertThat(result.getSubmittedAt()).isNotNull();
        assertThat(result.getSubmitUrl()).isEqualTo(STORED_SUBMIT_URL);
    }

    @Test
    @DisplayName("진행 중인 산책 세션 키로 셀을 제출하면 세션 키를 기록한다")
    void submitCellRecordsClientSessionKey() {
        // given
        UUID walkSessionKey = UUID.fromString("2ae853f8-ff73-48fc-b166-4b85daf9960c");
        Room room = room(10L);
        Game game = game(20L, LocalDateTime.now());
        BingoBoard board = board(30L, game.getId());
        BingoCell cell = BingoCell.create(board.getId(), 40L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", 50L);
        givenSubmissionContext(room, game, board, cell);
        given(walkSessionRepository.existsByMemberIdAndClientSessionKey(1L, walkSessionKey.toString()))
                .willReturn(false);
        given(activeWalkSessionRepository.findByMemberIdAndWalkSessionKey(1L, walkSessionKey.toString()))
                .willReturn(Optional.of(activeSession(walkSessionKey, 10L)));
        given(bingoCellRepository.save(cell)).willReturn(cell);
        given(imageUploadService.upload(any(MultipartFile.class), eq("bingo-cells"), anyString()))
                .willReturn(STORED_SUBMIT_URL);

        // when
        BingoCell result = bingoCommandService.submitCell(1L, 10L, 50L, image(), walkSessionKey);

        // then
        assertThat(result.getClientSessionKey()).isEqualTo(walkSessionKey.toString());
    }

    @Test
    @DisplayName("완료된 산책 세션 키로 셀을 제출하면 거부한다")
    void submitCellRejectsCompletedSessionKey() {
        // given
        UUID walkSessionKey = UUID.fromString("2ae853f8-ff73-48fc-b166-4b85daf9960c");
        Room room = room(10L);
        Game game = game(20L, LocalDateTime.now());
        BingoBoard board = board(30L, game.getId());
        BingoCell cell = BingoCell.create(board.getId(), 40L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", 50L);
        givenSubmissionContext(room, game, board, cell);
        given(walkSessionRepository.existsByMemberIdAndClientSessionKey(1L, walkSessionKey.toString()))
                .willReturn(true);

        // when & then
        assertThatThrownBy(() -> bingoCommandService.submitCell(1L, 10L, 50L, image(), walkSessionKey))
                .isInstanceOf(CustomException.class)
                .extracting(exception -> ((CustomException) exception).getErrorCode())
                .isEqualTo(ErrorCode.WALK_SESSION_ALREADY_COMPLETED);
        then(imageUploadService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("다른 방의 산책 세션 키로 셀을 제출하면 거부한다")
    void submitCellRejectsRoomMismatchSessionKey() {
        // given
        UUID walkSessionKey = UUID.fromString("2ae853f8-ff73-48fc-b166-4b85daf9960c");
        Room room = room(10L);
        Game game = game(20L, LocalDateTime.now());
        BingoBoard board = board(30L, game.getId());
        BingoCell cell = BingoCell.create(board.getId(), 40L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", 50L);
        givenSubmissionContext(room, game, board, cell);
        given(walkSessionRepository.existsByMemberIdAndClientSessionKey(1L, walkSessionKey.toString()))
                .willReturn(false);
        given(activeWalkSessionRepository.findByMemberIdAndWalkSessionKey(1L, walkSessionKey.toString()))
                .willReturn(Optional.of(activeSession(walkSessionKey, 99L)));

        // when & then
        assertThatThrownBy(() -> bingoCommandService.submitCell(1L, 10L, 50L, image(), walkSessionKey))
                .isInstanceOf(CustomException.class)
                .extracting(exception -> ((CustomException) exception).getErrorCode())
                .isEqualTo(ErrorCode.WALK_SESSION_ROOM_MISMATCH);
        then(imageUploadService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("거절된 셀을 다시 제출하면 이전 이미지를 삭제한다")
    void submitCellDeletesPreviousImageOnResubmit() {
        // given
        Room room = room(10L);
        Game game = game(20L, LocalDateTime.now());
        BingoBoard board = board(30L, game.getId());
        BingoCell cell = BingoCell.create(board.getId(), 40L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", 50L);
        String previousSubmitUrl = "/uploads/test/bingo-cells/1000/previous.png";
        cell.submit(1L, previousSubmitUrl);
        cell.reject("Proof image does not match the condition.");
        givenSubmissionContext(room, game, board, cell);
        given(bingoCellRepository.save(cell)).willReturn(cell);
        given(imageUploadService.upload(any(MultipartFile.class), eq("bingo-cells"), anyString()))
                .willReturn(STORED_SUBMIT_URL);

        // when
        bingoCommandService.submitCell(1L, 10L, 50L, image());

        // then
        then(imageUploadService).should().delete(previousSubmitUrl);
    }

    @Test
    @DisplayName("공유 사이클이 만료된 뒤 셀을 제출하면 거부한다")
    void submitCellRejectsExpiredSharedCycle() {
        // given
        Room room = room(10L);
        Game game = game(20L, LocalDateTime.now().minusDays(8));
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(10L, GameStatus.ACTIVE))
                .willReturn(Optional.of(game));

        // when & then
        assertThatThrownBy(() -> bingoCommandService.submitCell(1L, 10L, 50L, image()))
                .isInstanceOf(CustomException.class)
                .extracting(exception -> ((CustomException) exception).getErrorCode())
                .isEqualTo(ErrorCode.BINGO_BOARD_RENEWAL_REQUIRED);
    }

    @Test
    @DisplayName("빙고판 갱신 설정을 게임 사이클 서비스에 전달한다")
    void renewBoardDelegatesAllSettings() {
        // given
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
                true,
                false,
                false,
                null,
                null
        );
        given(gameCycleCommandService.renewSharedCycle(1L, 10L, 4, 12_000))
                .willReturn(expected);

        // when
        BingoBoardResponse result = bingoCommandService.renewBoard(1L, 10L, 4, 12_000);

        // then
        assertThat(result).isSameAs(expected);
    }

    @Test
    @DisplayName("재대결 요청을 게임 사이클 서비스에 위임한다")
    void rematchBattleDelegates() {
        // when
        bingoCommandService.rematchBattle(1L, 10L);

        // then
        then(gameCycleCommandService).should().rematchBattle(1L, 10L);
    }

    private void givenSubmissionContext(Room room, Game game, BingoBoard board, BingoCell cell) {
        given(roomRepository.findByIdForUpdate(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(10L, GameStatus.ACTIVE))
                .willReturn(Optional.of(game));
        given(bingoBoardRepository.findActiveBoardForUpdate(game.getId(), BingoBoardStatus.inactiveStatuses()))
                .willReturn(Optional.of(board));
        given(bingoCellRepository.findByIdForUpdate(50L)).willReturn(Optional.of(cell));
    }

    private MultipartFile image() {
        return new MockMultipartFile("image", "proof.png", "image/png", new byte[]{1, 2, 3});
    }

    private Room room(Long roomId) {
        Room room = Room.create(1L, "Shared Room", GameMode.COOPERATE, 2, 10_000, 3);
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
        BingoBoard board = BingoBoard.create(gameId, 3, 10_000);
        ReflectionTestUtils.setField(board, "id", boardId);
        return board;
    }

    private ActiveWalkSession activeSession(UUID walkSessionKey, Long roomId) {
        return ActiveWalkSession.create(
                1L,
                roomId,
                walkSessionKey.toString(),
                30L,
                Instant.now().minus(Duration.ofMinutes(10)),
                Instant.now().plus(Duration.ofHours(1))
        );
    }
}
