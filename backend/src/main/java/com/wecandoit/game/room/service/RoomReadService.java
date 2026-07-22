package com.wecandoit.game.room.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.room.controller.response.RoomMemberResponse;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.domain.RoomMember;
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
import com.wecandoit.member.service.MemberReadService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoomReadService {

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final MemberReadService memberReadService;

    public List<RoomMemberResponse> getRoomMembers(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN);
        }

        List<RoomMember> roomMembers = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(roomId);
        if (roomMembers.isEmpty()) {
            return List.of();
        }

        Map<Long, String> nicknamesByMemberId = getNicknamesByMemberId(roomMembers);
        return roomMembers.stream()
                .map(roomMember -> RoomMemberResponse.from(
                        roomMember,
                        getNickname(nicknamesByMemberId, roomMember.getMemberId()),
                        room.getHostId().equals(roomMember.getMemberId())
                ))
                .toList();
    }

    private Map<Long, String> getNicknamesByMemberId(List<RoomMember> roomMembers) {
        List<Long> memberIds = roomMembers.stream()
                .map(RoomMember::getMemberId)
                .distinct()
                .toList();
        return memberReadService.getNicknamesByIds(memberIds);
    }

    private String getNickname(Map<Long, String> nicknamesByMemberId, Long memberId) {
        String nickname = nicknamesByMemberId.get(memberId);
        if (nickname == null) {
            throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        }
        return nickname;
    }
}
