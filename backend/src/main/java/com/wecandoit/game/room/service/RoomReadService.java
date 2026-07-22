package com.wecandoit.game.room.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.room.controller.response.MyRoomMemberResponse;
import com.wecandoit.game.room.controller.response.MyRoomResponse;
import com.wecandoit.game.room.controller.response.RoomDetailResponse;
import com.wecandoit.game.room.controller.response.RoomMemberResponse;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.domain.RoomMember;
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
import com.wecandoit.member.service.MemberReadService;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
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

    public RoomDetailResponse getRoomDetail(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN);
        }
        if (room.getStatus() == GameRoomStatus.CLOSED) {
            throw new CustomException(ErrorCode.ROOM_CLOSED);
        }

        List<RoomMember> roomMembers = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(roomId);
        return RoomDetailResponse.from(room, getRoomMemberResponses(room, roomMembers));
    }

    public List<MyRoomResponse> getMyRooms(Long memberId) {
        List<RoomMember> myRoomMembers = roomMemberRepository.findAllByMemberIdOrderByJoinedAtDesc(memberId);
        if (myRoomMembers.isEmpty()) {
            return List.of();
        }

        List<Long> roomIds = myRoomMembers.stream()
                .map(RoomMember::getRoomId)
                .distinct()
                .toList();
        Map<Long, Room> roomsById = getRoomsById(roomIds);
        List<RoomMember> activeRoomMembers = myRoomMembers.stream()
                .filter(roomMember -> roomsById.get(roomMember.getRoomId()).getStatus() != GameRoomStatus.CLOSED)
                .toList();
        if (activeRoomMembers.isEmpty()) {
            return List.of();
        }

        List<Long> activeRoomIds = activeRoomMembers.stream()
                .map(RoomMember::getRoomId)
                .distinct()
                .toList();
        List<RoomMember> allRoomMembers = roomMemberRepository.findAllByRoomIdInOrderByJoinedAtAsc(activeRoomIds);
        Map<Long, String> nicknamesByMemberId = getNicknamesByMemberId(allRoomMembers);
        Map<Long, List<MyRoomMemberResponse>> membersByRoomId = getMembersByRoomId(
                roomsById,
                allRoomMembers,
                nicknamesByMemberId
        );

        return activeRoomMembers.stream()
                .map(roomMember -> MyRoomResponse.from(
                        roomsById.get(roomMember.getRoomId()),
                        roomMember,
                        membersByRoomId.getOrDefault(roomMember.getRoomId(), List.of())
                ))
                .toList();
    }

    public List<RoomMemberResponse> getRoomMembers(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN);
        }

        List<RoomMember> roomMembers = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(roomId);
        return getRoomMemberResponses(room, roomMembers);
    }

    private List<RoomMemberResponse> getRoomMemberResponses(Room room, List<RoomMember> roomMembers) {
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

    private Map<Long, Room> getRoomsById(List<Long> roomIds) {
        Map<Long, Room> roomsById = roomRepository.findAllById(roomIds).stream()
                .collect(Collectors.toMap(Room::getId, room -> room));
        if (roomsById.size() != roomIds.size()) {
            throw new CustomException(ErrorCode.ROOM_NOT_FOUND);
        }
        return roomsById;
    }

    private Map<Long, List<MyRoomMemberResponse>> getMembersByRoomId(
            Map<Long, Room> roomsById,
            List<RoomMember> roomMembers,
            Map<Long, String> nicknamesByMemberId
    ) {
        return roomMembers.stream()
                .collect(Collectors.groupingBy(
                        RoomMember::getRoomId,
                        Collectors.mapping(
                                roomMember -> MyRoomMemberResponse.from(
                                        roomMember,
                                        getNickname(nicknamesByMemberId, roomMember.getMemberId()),
                                        roomsById.get(roomMember.getRoomId()).getHostId()
                                                .equals(roomMember.getMemberId())
                                ),
                                Collectors.toList()
                        )
                ));
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
