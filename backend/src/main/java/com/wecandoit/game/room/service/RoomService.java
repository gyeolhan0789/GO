package com.wecandoit.game.room.service;

import com.wecandoit.game.room.controller.request.CreateRoomRequest;
import com.wecandoit.game.room.controller.response.CreateRoomResponse;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.domain.RoomMember;
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;

    public CreateRoomResponse createRoom(Long memberId, CreateRoomRequest request) {
        Room room = roomRepository.save(Room.create(
                memberId,
                request.mode(),
                request.targetBingoCount()
        ));
        roomMemberRepository.save(RoomMember.create(room.getId(), memberId));
        // TODO: Connect game requests, bingo board creation, and mission assignment after policy is confirmed.
        return CreateRoomResponse.from(room);
    }
}
