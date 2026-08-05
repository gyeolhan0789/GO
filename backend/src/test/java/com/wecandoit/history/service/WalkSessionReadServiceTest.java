package com.wecandoit.history.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.history.controller.response.WalkSessionDetailResponse;
import com.wecandoit.history.controller.response.WalkSessionResponse;
import com.wecandoit.history.domain.WalkSession;
import com.wecandoit.history.domain.WalkSessionBingoAchievement;
import com.wecandoit.history.repository.WalkSessionBingoAchievementRepository;
import com.wecandoit.history.repository.WalkSessionRepository;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionType;
import com.wecandoit.mission.repository.MissionRepository;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.SliceImpl;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("산책 세션 조회 서비스")
@ExtendWith(MockitoExtension.class)
class WalkSessionReadServiceTest {

    @Mock
    private WalkSessionRepository walkSessionRepository;
    @Mock
    private WalkSessionBingoAchievementRepository achievementRepository;
    @Mock
    private RoomRepository roomRepository;
    @Mock
    private BingoBoardRepository bingoBoardRepository;
    @Mock
    private BingoCellRepository bingoCellRepository;
    @Mock
    private MissionRepository missionRepository;
    @InjectMocks
    private WalkSessionReadService walkSessionReadService;

    @Test
    @DisplayName("산책 세션 목록에 현재 방 정보와 빙고 성과 개수를 반환한다")
    void getWalkSessionsReturnsSummaries() {
        // given
        WalkSession walkSession = walkSession();
        WalkSessionBingoAchievement achievement = achievement();
        PageRequest pageable = PageRequest.of(0, 10);
        given(walkSessionRepository.findAllByMemberIdOrderByEndedAtDescIdDesc(1L, pageable))
                .willReturn(new SliceImpl<>(List.of(walkSession), pageable, false));
        given(roomRepository.findAllById(List.of(10L))).willReturn(List.of(room()));
        given(achievementRepository.findAllByWalkSessionIdIn(List.of(50L))).willReturn(List.of(achievement));

        // when
        SliceResponse<WalkSessionResponse> response = walkSessionReadService.getWalkSessions(1L, null, pageable);

        // then
        assertThat(response.content()).hasSize(1);
        assertThat(response.content().getFirst().roomName()).isEqualTo("현재 산책방 이름");
        assertThat(response.content().getFirst().durationSeconds()).isEqualTo(2_535L);
        assertThat(response.content().getFirst().activeDurationSeconds()).isEqualTo(2_400L);
        assertThat(response.content().getFirst().achievedMissionCount()).isEqualTo(1);
        assertThat(response.content().getFirst().missionEarnedPoint()).isEqualTo(50L);
        assertThat(response.content().getFirst().stepGoalEarnedPoint()).isEqualTo(100L);
        assertThat(response.content().getFirst().gameEarnedPoint()).isEqualTo(300L);
        assertThat(response.content().getFirst().earnedPoint()).isEqualTo(450L);
    }

    @Test
    @DisplayName("방 ID를 지정하면 해당 방의 산책 세션만 조회한다")
    void getWalkSessionsReturnsSpecifiedRoomSessions() {
        // given
        WalkSession walkSession = walkSession();
        PageRequest pageable = PageRequest.of(0, 10);
        given(walkSessionRepository.findAllByMemberIdAndRoomIdOrderByEndedAtDescIdDesc(1L, 10L, pageable))
                .willReturn(new SliceImpl<>(List.of(walkSession), pageable, false));
        given(roomRepository.findAllById(List.of(10L))).willReturn(List.of(room()));
        given(achievementRepository.findAllByWalkSessionIdIn(List.of(50L))).willReturn(List.of());

        // when
        SliceResponse<WalkSessionResponse> response = walkSessionReadService.getWalkSessions(1L, 10L, pageable);

        // then
        assertThat(response.content()).hasSize(1);
        assertThat(response.content().getFirst().roomId()).isEqualTo(10L);
    }

    @Test
    @DisplayName("산책 세션 상세에 전체 빙고판과 이번 세션 달성 셀을 구분해 반환한다")
    void getWalkSessionReturnsBoardWithSessionAchievement() {
        // given
        WalkSession walkSession = walkSession();
        WalkSessionBingoAchievement achievement = achievement();
        BingoBoard board = board();
        BingoCell cell = cell();
        Mission mission = mission();
        given(walkSessionRepository.findById(50L)).willReturn(Optional.of(walkSession));
        given(roomRepository.findById(10L)).willReturn(Optional.of(room()));
        given(achievementRepository.findAllByWalkSessionId(50L)).willReturn(List.of(achievement));
        given(bingoBoardRepository.findAllById(any())).willReturn(List.of(board));
        given(bingoCellRepository.findAllByBoardIdIn(List.of(30L))).willReturn(List.of(cell));
        given(missionRepository.findAllById(List.of(100L))).willReturn(List.of(mission));

        // when
        WalkSessionDetailResponse response = walkSessionReadService.getWalkSession(1L, 50L);

        // then
        assertThat(response.bingoBoards()).hasSize(1);
        assertThat(response.bingoBoards().getFirst().cells()).hasSize(1);
        assertThat(response.bingoBoards().getFirst().cells().getFirst().achievedInSession()).isTrue();
        assertThat(response.bingoBoards().getFirst().cells().getFirst().achievedAt())
                .isEqualTo(Instant.parse("2026-08-03T01:20:00Z"));
        assertThat(response.earnedPoint()).isEqualTo(450L);
    }

    @Test
    @DisplayName("다른 회원의 산책 세션 상세 조회를 거부한다")
    void getWalkSessionRejectsOtherMember() {
        // given
        given(walkSessionRepository.findById(50L)).willReturn(Optional.of(walkSession()));

        // when & then
        assertThatThrownBy(() -> walkSessionReadService.getWalkSession(2L, 50L))
                .isInstanceOf(CustomException.class)
                .extracting(exception -> ((CustomException) exception).getErrorCode())
                .isEqualTo(ErrorCode.WALK_SESSION_FORBIDDEN);
    }

    private WalkSession walkSession() {
        WalkSession walkSession = WalkSession.create(
                1L,
                10L,
                "2ae853f8-ff73-48fc-b166-4b85daf9960c",
                30L,
                Instant.parse("2026-08-03T01:00:00Z"),
                Instant.parse("2026-08-03T01:42:15Z"),
                2_400L,
                4_832,
                3_382,
                214
        );
        walkSession.recordEarnedPoints(50L, 100L, 300L);
        ReflectionTestUtils.setField(walkSession, "id", 50L);
        return walkSession;
    }

    private Room room() {
        Room room = Room.create(2L, "현재 산책방 이름", GameMode.COOPERATE, null, 10_000, 3);
        ReflectionTestUtils.setField(room, "id", 10L);
        return room;
    }

    private WalkSessionBingoAchievement achievement() {
        return WalkSessionBingoAchievement.create(
                50L,
                30L,
                40L,
                Instant.parse("2026-08-03T01:20:00Z")
        );
    }

    private BingoBoard board() {
        BingoBoard board = BingoBoard.create(20L, 3, 10_000);
        ReflectionTestUtils.setField(board, "id", 30L);
        ReflectionTestUtils.setField(board, "createdAt", LocalDateTime.of(2026, 8, 3, 10, 0));
        return board;
    }

    private BingoCell cell() {
        BingoCell cell = BingoCell.create(30L, 100L, 0, 0);
        ReflectionTestUtils.setField(cell, "id", 40L);
        return cell;
    }

    private Mission mission() {
        Mission mission = Mission.create(
                "https://example.com/mission.png",
                MissionType.OBJECT,
                "파란 물건 찾기",
                "파란 물건을 촬영하세요.",
                "{\"target\":\"blue\"}"
        );
        ReflectionTestUtils.setField(mission, "id", 100L);
        return mission;
    }
}
