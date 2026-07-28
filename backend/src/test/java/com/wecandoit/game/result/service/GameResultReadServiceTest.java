package com.wecandoit.game.result.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.game.controller.response.GameResultResponse;
import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.GameResultParticipant;
import com.wecandoit.game.repository.GameResultParticipantRepository;
import com.wecandoit.game.repository.GameResultRepository;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.GameResultReadService;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
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
    private GameResultReadService gameResultReadService;

    @BeforeEach
    void setUp() {
        gameResultReadService = new GameResultReadService(
                gameResultRepository,
                gameResultParticipantRepository,
                roomRepository,
                roomMemberRepository,
                memberRepository
        );
    }

    @Test
    @DisplayName("완료된 방의 결과를 조회하면 게임 결과를 반환한다")
    void getGameResultReturnsResultForCompletedRoom() {
        // given
        Room room = completedCooperateRoom(10L, 1L);
        GameResult gameResult = gameResult(100L, 10L, 1000L);
        GameResultParticipant host = participant(100L, 1L, 3);
        GameResultParticipant participant = participant(100L, 2L, 2);
        given(roomRepository.findById(10L)).willReturn(Optional.of(room));
        given(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).willReturn(true);
        given(gameResultRepository.findFirstByRoomIdOrderByCreatedAtDescIdDesc(10L))
                .willReturn(Optional.of(gameResult));
        given(gameResultParticipantRepository.findAllByGameIdOrderByIdAsc(100L))
                .willReturn(List.of(host, participant));
        given(memberRepository.findAllById(List.of(1L, 2L)))
                .willReturn(List.of(member(1L, "host"), member(2L, "participant")));

        // when
        GameResultResponse response = gameResultReadService.getGameResult(1L, 10L);

        // then
        assertThat(response.roomId()).isEqualTo(10L);
        assertThat(response.gameId()).isEqualTo(100L);
        assertThat(response.mode()).isEqualTo(GameMode.COOPERATE);
        assertThat(response.result()).isTrue();
        assertThat(response.boardSize()).isEqualTo(3);
        assertThat(response.targetBingoCount()).isEqualTo(3);
        assertThat(response.bingoCount()).isEqualTo(3);
        assertThat(response.completedMissionCount()).isEqualTo(5);
        assertThat(response.rewardCash()).isEqualTo(500L);
        assertThat(response.participants())
                .extracting(
                        participantResponse -> participantResponse.memberId(),
                        participantResponse -> participantResponse.nickname(),
                        participantResponse -> participantResponse.completedMissionCount(),
                        participantResponse -> participantResponse.rewardCash()
                )
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(1L, "host", 3, 500L),
                        org.assertj.core.groups.Tuple.tuple(2L, "participant", 2, 500L)
                );
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
        given(gameResultRepository.findFirstByRoomIdOrderByCreatedAtDescIdDesc(10L)).willReturn(Optional.empty());

        // when & then
        assertErrorCode(() -> gameResultReadService.getGameResult(1L, 10L), ErrorCode.GAME_NOT_COMPLETED);
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
                .willReturn(List.of(completedRoom(20L, 1L)));
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

    private Room completedRoom(Long roomId, Long hostId) {
        Room room = Room.create(hostId, GameMode.SINGLE, 3, 3, null);
        ReflectionTestUtils.setField(room, "id", roomId);
        room.complete();
        return room;
    }

    private Room completedCooperateRoom(Long roomId, Long hostId) {
        Room room = Room.create(hostId, GameMode.COOPERATE, 3, 3, 10000);
        ReflectionTestUtils.setField(room, "id", roomId);
        room.complete();
        return room;
    }

    private RoomMember roomMember(Long roomId, Long memberId, int completedMissionCount) {
        RoomMember roomMember = RoomMember.create(roomId, memberId);
        roomMember.updateCompletedMissionCount(completedMissionCount);
        return roomMember;
    }

    private GameResult gameResult(Long gameId, Long roomId, Long resultId) {
        GameResult gameResult = GameResult.create(gameId, roomId, true, 3, 5, 500L);
        ReflectionTestUtils.setField(gameResult, "id", resultId);
        return gameResult;
    }

    private GameResultParticipant participant(Long gameId, Long memberId, int completedMissionCount) {
        return GameResultParticipant.create(gameId, memberId, completedMissionCount, 500L);
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
