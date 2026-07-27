package com.wecandoit.game.result.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.game.result.controller.response.GameResultResponse;
import com.wecandoit.game.result.domain.GameResult;
import com.wecandoit.game.result.repository.GameResultRepository;
import com.wecandoit.game.room.domain.GameMode;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.domain.RoomMember;
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
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
    private RoomRepository roomRepository;
    @Mock
    private RoomMemberRepository roomMemberRepository;
    private GameResultReadService gameResultReadService;

    @BeforeEach
    void setUp() {
        gameResultReadService = new GameResultReadService(
                gameResultRepository,
                roomRepository,
                roomMemberRepository
        );
    }

    @Test
    @DisplayName("완료된 방의 결과를 조회하면 게임 결과를 반환한다")
    void getGameResultReturnsResultForCompletedRoom() {
        // given
        Room room = completedRoom(10L, 1L);
        GameResult gameResult = GameResult.create(10L, true, 3, 9, 500L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(gameResultRepository.findByRoomId(10L)).willReturn(Optional.of(gameResult));

        // when
        GameResultResponse response = gameResultReadService.getGameResult(1L, 10L);

        // then
        assertThat(response.roomId()).isEqualTo(10L);
        assertThat(response.result()).isTrue();
        assertThat(response.boardSize()).isEqualTo(3);
        assertThat(response.bingoCount()).isEqualTo(3);
        assertThat(response.completedMissionCount()).isEqualTo(9);
        assertThat(response.rewardCash()).isEqualTo(500L);
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
        Room room = completedRoom(10L, 1L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).willReturn(false);

        // when & then
        assertErrorCode(() -> gameResultReadService.getGameResult(2L, 10L), ErrorCode.ROOM_MEMBER_FORBIDDEN);
    }

    @Test
    @DisplayName("완료되지 않은 방의 결과를 조회하면 실패한다")
    void getGameResultRejectsNotCompletedRoom() {
        // given
        Room room = Room.create(1L, GameMode.SINGLE, 3, 3, null);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);

        // when & then
        assertErrorCode(() -> gameResultReadService.getGameResult(1L, 10L), ErrorCode.GAME_NOT_COMPLETED);
    }

    @Test
    @DisplayName("완료된 방인데 게임 결과가 없으면 결과 조회에 실패한다")
    void getGameResultRejectsMissingGameResult() {
        // given
        Room room = completedRoom(10L, 1L);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(gameResultRepository.findByRoomId(10L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(() -> gameResultReadService.getGameResult(1L, 10L), ErrorCode.GAME_NOT_COMPLETED);
    }

    @Test
    @DisplayName("참여했던 방들의 게임 결과를 최신순으로 반환한다")
    void getMyGameResultsReturnsResultsOrderedByLatest() {
        // given
        RoomMember firstRoomMember = RoomMember.create(10L, 1L);
        RoomMember secondRoomMember = RoomMember.create(20L, 1L);
        GameResult latestResult = GameResult.create(20L, true, 3, 9, 500L);
        Pageable pageable = PageRequest.of(0, 10);
        given(roomMemberRepository.findAllByMemberIdOrderByJoinedAtDesc(1L))
                .willReturn(List.of(secondRoomMember, firstRoomMember));
        given(gameResultRepository.findByRoomIdInOrderByCreatedAtDesc(List.of(20L, 10L), pageable))
                .willReturn(new SliceImpl<>(List.of(latestResult), pageable, false));
        given(roomRepository.findAllById(List.of(20L)))
                .willReturn(List.of(completedRoom(20L, 1L)));

        // when
        SliceResponse<GameResultResponse> response = gameResultReadService.getMyGameResults(1L, pageable);

        // then
        assertThat(response.content()).hasSize(1);
        assertThat(response.content().get(0).roomId()).isEqualTo(20L);
        assertThat(response.content().get(0).boardSize()).isEqualTo(3);
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

    private Room completedRoom(Long roomId, Long hostId) {
        Room room = Room.create(hostId, GameMode.SINGLE, 3, 3, null);
        ReflectionTestUtils.setField(room, "id", roomId);
        room.complete();
        return room;
    }

    private void assertErrorCode(Runnable action, ErrorCode errorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(errorCode);
    }
}
