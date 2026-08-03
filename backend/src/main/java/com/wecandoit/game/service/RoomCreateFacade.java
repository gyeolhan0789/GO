package com.wecandoit.game.service;

import com.wecandoit.game.controller.request.CreateRoomRequest;
import com.wecandoit.game.controller.response.CreateRoomResponse;
import com.wecandoit.game.controller.response.RoomDetailResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class RoomCreateFacade {

    private final RoomCommandService roomCommandService;
    private final RoomReadService roomReadService;

    public RoomDetailResponse createRoom(Long memberId, CreateRoomRequest request) {
        CreateRoomResponse response = roomCommandService.createRoom(memberId, request);
        return roomReadService.getRoomDetail(memberId, response.roomId());
    }
}
