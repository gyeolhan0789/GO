package com.wecandoit.game.room.controller;

import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.game.room.controller.request.CreateRoomRequest;
import com.wecandoit.game.room.controller.response.CreateRoomResponse;
import com.wecandoit.game.room.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    @PostMapping
    public ResponseEntity<CreateRoomResponse> createRoom(
            @LoginMemberId Long memberId,
            @Valid @RequestBody CreateRoomRequest request
    ) {
        CreateRoomResponse response = roomService.createRoom(memberId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
