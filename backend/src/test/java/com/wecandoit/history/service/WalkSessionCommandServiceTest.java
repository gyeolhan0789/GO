package com.wecandoit.history.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.history.controller.request.WalkSessionCompleteRequest;
import com.wecandoit.history.controller.request.WalkSessionStartRequest;
import com.wecandoit.history.domain.ActiveWalkSession;
import com.wecandoit.history.domain.WalkSession;
import com.wecandoit.history.repository.ActiveWalkSessionRepository;
import com.wecandoit.history.repository.WalkSessionBingoAchievementRepository;
import com.wecandoit.history.repository.WalkSessionRepository;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.repository.MemberRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("산책 세션 명령 서비스")
@ExtendWith(MockitoExtension.class)
class WalkSessionCommandServiceTest {

    private static final UUID SESSION_KEY = UUID.fromString("2ae853f8-ff73-48fc-b166-4b85daf9960c");

    @Mock
    private MemberRepository memberRepository;
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
    private WalkSessionBingoAchievementRepository achievementRepository;
    @Mock
    private HistoryCommandService historyCommandService;
    @InjectMocks
    private WalkSessionCommandService walkSessionCommandService;

    @Test
    @DisplayName("산책 세션을 시작하면 서버가 생성한 세션 키를 저장하고 반환한다")
    void startSessionCreatesActiveSession() {
        // given
        WalkSessionStartRequest request = new WalkSessionStartRequest(10L, 30L);
        Room room = room();
        Game game = game();
        BingoBoard board = board();
        given(memberRepository.findByIdForUpdate(1L))
                .willReturn(Optional.of(Member.create("a@a.com", "pw", "a", null, Gender.MALE)));
        given(activeWalkSessionRepository.findByMemberIdForUpdate(1L)).willReturn(Optional.empty());
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(bingoBoardRepository.findAllById(any())).willReturn(List.of(board));
        given(gameRepository.findAllById(any())).willReturn(List.of(game));
        given(gameParticipantRepository.existsByGameIdAndMemberId(20L, 1L)).willReturn(true);
        given(activeWalkSessionRepository.save(any(ActiveWalkSession.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        // when
        WalkSessionCommandService.StartResult result = walkSessionCommandService.startSession(1L, request);

        // then
        assertThat(result.created()).isTrue();
        assertThat(result.response().walkSessionKey()).isNotNull();
        assertThat(result.response().roomId()).isEqualTo(10L);
        assertThat(result.response().initialBingoBoardId()).isEqualTo(30L);
    }

    @Test
    @DisplayName("진행 중인 산책 세션이 있으면 새로 만들지 않고 기존 세션을 반환한다")
    void startSessionReturnsExistingActiveSession() {
        // given
        WalkSessionStartRequest request = new WalkSessionStartRequest(10L, 30L);
        ActiveWalkSession activeWalkSession = activeSession();
        given(memberRepository.findByIdForUpdate(1L))
                .willReturn(Optional.of(Member.create("a@a.com", "pw", "a", null, Gender.MALE)));
        given(activeWalkSessionRepository.findByMemberIdForUpdate(1L))
                .willReturn(Optional.of(activeWalkSession));
        given(roomRepository.findById(10L)).willReturn(Optional.of(room()));

        // when
        WalkSessionCommandService.StartResult result = walkSessionCommandService.startSession(1L, request);

        // then
        assertThat(result.created()).isFalse();
        assertThat(result.response().walkSessionKey()).isEqualTo(SESSION_KEY);
        then(activeWalkSessionRepository).should(never()).save(any());
    }

    @Test
    @DisplayName("산책 세션을 완료하면 승인된 내 빙고 성과와 일별 기록을 저장한다")
    void completeSessionSavesAchievementsAndDailyHistory() {
        // given
        WalkSessionCompleteRequest request = request(30L);
        Room room = room();
        Game game = game();
        BingoBoard board = board();
        BingoCell cell = approvedCell();
        givenCompletionContext(request, room, game, board, List.of(cell));
        given(walkSessionRepository.saveAndFlush(any(WalkSession.class))).willAnswer(invocation -> {
            WalkSession walkSession = invocation.getArgument(0);
            ReflectionTestUtils.setField(walkSession, "id", 50L);
            return walkSession;
        });
        given(achievementRepository.saveAll(any())).willAnswer(invocation -> invocation.getArgument(0));

        // when
        WalkSessionCommandService.CompletionResult result =
                walkSessionCommandService.completeSession(1L, request);

        // then
        assertThat(result.created()).isTrue();
        assertThat(result.response().walkSessionId()).isEqualTo(50L);
        assertThat(result.response().achievedMissionCount()).isEqualTo(1);
        then(achievementRepository).should().saveAll(any());
        then(historyCommandService).should().addHistory(
                1L,
                LocalDate.of(2026, 8, 3),
                4_832,
                3_382,
                214
        );
    }

    @Test
    @DisplayName("같은 클라이언트 세션 키가 재요청되면 기존 세션만 반환한다")
    void completeSessionReturnsExistingSessionForDuplicateKey() {
        // given
        WalkSessionCompleteRequest request = request(30L);
        WalkSession existingSession = WalkSession.create(
                1L,
                10L,
                SESSION_KEY.toString(),
                30L,
                OffsetDateTime.of(2026, 8, 3, 10, 0, 0, 0, ZoneOffset.ofHours(9)).toInstant(),
                request.endedAt().toInstant(),
                request.step(),
                request.distance(),
                request.calories()
        );
        ReflectionTestUtils.setField(existingSession, "id", 50L);
        given(memberRepository.findByIdForUpdate(1L))
                .willReturn(Optional.of(Member.create("a@a.com", "pw", "a", null, Gender.MALE)));
        given(walkSessionRepository.findByMemberIdAndClientSessionKey(1L, SESSION_KEY.toString()))
                .willReturn(Optional.of(existingSession));
        given(roomRepository.findById(10L)).willReturn(Optional.of(room()));
        given(achievementRepository.countByWalkSessionId(50L)).willReturn(2L);

        // when
        WalkSessionCommandService.CompletionResult result =
                walkSessionCommandService.completeSession(1L, request);

        // then
        assertThat(result.created()).isFalse();
        assertThat(result.response().achievedMissionCount()).isEqualTo(2);
        then(walkSessionRepository).should(never()).saveAndFlush(any());
        then(historyCommandService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("세션 키로 제출한 빙고 셀이 검증 중이면 산책 완료를 거부한다")
    void completeSessionRejectsPendingBingoCell() {
        // given
        WalkSessionCompleteRequest request = request(30L);
        BingoCell pendingCell = BingoCell.create(30L, 100L, 0, 0);
        pendingCell.submit(1L, "https://example.com/pending.png", SESSION_KEY.toString());
        given(memberRepository.findByIdForUpdate(1L))
                .willReturn(Optional.of(Member.create("a@a.com", "pw", "a", null, Gender.MALE)));
        given(walkSessionRepository.findByMemberIdAndClientSessionKey(1L, SESSION_KEY.toString()))
                .willReturn(Optional.empty());
        given(activeWalkSessionRepository.findByMemberIdAndWalkSessionKeyForUpdate(1L, SESSION_KEY.toString()))
                .willReturn(Optional.of(activeSession()));
        given(roomRepository.findById(10L)).willReturn(Optional.of(room()));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(bingoCellRepository.findAllByMemberIdAndClientSessionKey(1L, SESSION_KEY.toString()))
                .willReturn(List.of(pendingCell));

        // when & then
        assertThatThrownBy(() -> walkSessionCommandService.completeSession(1L, request))
                .isInstanceOf(CustomException.class)
                .extracting(exception -> ((CustomException) exception).getErrorCode())
                .isEqualTo(ErrorCode.WALK_SESSION_BINGO_VERIFICATION_IN_PROGRESS);
        then(walkSessionRepository).should(never()).saveAndFlush(any());
        then(activeWalkSessionRepository).should(never()).delete(any());
    }

    private void givenCompletionContext(
            WalkSessionCompleteRequest request,
            Room room,
            Game game,
            BingoBoard board,
            List<BingoCell> cells
    ) {
        given(memberRepository.findByIdForUpdate(1L))
                .willReturn(Optional.of(Member.create("a@a.com", "pw", "a", null, Gender.MALE)));
        given(walkSessionRepository.findByMemberIdAndClientSessionKey(1L, SESSION_KEY.toString()))
                .willReturn(Optional.empty());
        given(activeWalkSessionRepository.findByMemberIdAndWalkSessionKeyForUpdate(1L, SESSION_KEY.toString()))
                .willReturn(Optional.of(activeSession()));
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(request.roomId(), 1L)).willReturn(true);
        given(bingoCellRepository.findAllByMemberIdAndClientSessionKey(1L, SESSION_KEY.toString()))
                .willReturn(cells);
        given(bingoBoardRepository.findAllById(any())).willReturn(List.of(board));
        given(gameRepository.findAllById(any())).willReturn(List.of(game));
        given(gameParticipantRepository.existsByGameIdAndMemberId(20L, 1L)).willReturn(true);
    }

    private WalkSessionCompleteRequest request(Long bingoBoardId) {
        return new WalkSessionCompleteRequest(
                SESSION_KEY,
                null,
                10L,
                bingoBoardId,
                null,
                OffsetDateTime.of(2026, 8, 3, 10, 42, 15, 0, ZoneOffset.ofHours(9)),
                4_832,
                3_382,
                214
        );
    }

    private Room room() {
        Room room = Room.create(2L, "저녁 산책방", GameMode.COOPERATE, null, 10_000, 3);
        ReflectionTestUtils.setField(room, "id", 10L);
        return room;
    }

    private Game game() {
        Game game = Game.start(10L);
        ReflectionTestUtils.setField(game, "id", 20L);
        return game;
    }

    private BingoBoard board() {
        BingoBoard board = BingoBoard.create(20L, 3, 10_000);
        ReflectionTestUtils.setField(board, "id", 30L);
        return board;
    }

    private BingoCell approvedCell() {
        BingoCell cell = BingoCell.create(30L, 100L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", 40L);
        cell.submit(1L, "https://example.com/approved.png", SESSION_KEY.toString());
        cell.approve();
        return cell;
    }

    private ActiveWalkSession activeSession() {
        return ActiveWalkSession.create(
                1L,
                10L,
                SESSION_KEY.toString(),
                30L,
                OffsetDateTime.of(2026, 8, 3, 10, 0, 0, 0, ZoneOffset.ofHours(9)).toInstant(),
                OffsetDateTime.now().plusDays(1).toInstant()
        );
    }
}
