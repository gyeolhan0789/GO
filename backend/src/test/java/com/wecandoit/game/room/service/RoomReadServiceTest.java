package com.wecandoit.game.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.room.controller.response.RoomMemberResponse;
import com.wecandoit.game.room.domain.GameMode;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.domain.RoomMember;
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
import com.wecandoit.member.service.MemberReadService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("게임방 조회 서비스")
class RoomReadServiceTest {

    private final RoomRepository roomRepository = Mockito.mock(RoomRepository.class);
    private final RoomMemberRepository roomMemberRepository = Mockito.mock(RoomMemberRepository.class);
    private final MemberReadService memberReadService = Mockito.mock(MemberReadService.class);
    private final RoomReadService roomReadService = new RoomReadService(
            roomRepository,
            roomMemberRepository,
            memberReadService
    );

    @Test
    @DisplayName("게임방 참여자 목록을 닉네임과 방장 여부를 포함해 반환한다")
    void getRoomMembersReturnsMembersWithNicknamesAndHostFlag() {
        // given
        Room room = room(10L, 1L);
        RoomMember hostMember = roomMember(10L, 1L, 2, LocalDateTime.of(2026, 7, 22, 10, 0));
        RoomMember guestMember = roomMember(10L, 2L, 1, LocalDateTime.of(2026, 7, 22, 10, 5));
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).thenReturn(true);
        when(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L))
                .thenReturn(List.of(hostMember, guestMember));
        when(memberReadService.getNicknamesByIds(List.of(1L, 2L)))
                .thenReturn(Map.of(1L, "방장", 2L, "참여자"));

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
        verify(roomMemberRepository).findAllByRoomIdOrderByJoinedAtAsc(10L);
    }

    @Test
    @DisplayName("게임방 참여자가 없으면 빈 목록을 반환한다")
    void getRoomMembersReturnsEmptyList() {
        // given
        Room room = room(10L, 1L);
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).thenReturn(true);
        when(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L)).thenReturn(List.of());

        // when
        List<RoomMemberResponse> responses = roomReadService.getRoomMembers(1L, 10L);

        // then
        assertThat(responses).isEmpty();
    }

    @Test
    @DisplayName("존재하지 않는 게임방의 참여자 목록을 조회하면 실패한다")
    void getRoomMembersRejectsMissingRoom() {
        // given
        when(roomRepository.findById(10L)).thenReturn(Optional.empty());

        // when, then
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
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 2L)).thenReturn(false);

        // when, then
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
        when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(roomMemberRepository.existsByRoomIdAndMemberId(10L, 1L)).thenReturn(true);
        when(roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(10L)).thenReturn(List.of(roomMember));
        when(memberReadService.getNicknamesByIds(List.of(1L)))
                .thenThrow(new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        // when, then
        assertErrorCode(
                () -> roomReadService.getRoomMembers(1L, 10L),
                ErrorCode.MEMBER_NOT_FOUND
        );
    }

    private Room room(Long roomId, Long hostId) {
        Room room = Room.create(hostId, GameMode.SINGLE, 3);
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
