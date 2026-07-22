package com.wecandoit.game.room.controller;

import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.game.room.controller.request.CreateRoomRequest;
import com.wecandoit.game.room.controller.response.CreateRoomResponse;
import com.wecandoit.game.room.controller.response.MyRoomResponse;
import com.wecandoit.game.room.controller.response.RoomMemberResponse;
import com.wecandoit.game.room.service.RoomCommandService;
import com.wecandoit.game.room.service.RoomReadService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomCommandService roomCommandService;
    private final RoomReadService roomReadService;

    @GetMapping
    public ResponseEntity<List<MyRoomResponse>> getMyRooms(@LoginMemberId Long memberId) {
        List<MyRoomResponse> responses = roomReadService.getMyRooms(memberId);
        return ResponseEntity.ok(responses);
    }

    @PostMapping
    public ResponseEntity<CreateRoomResponse> createRoom(
            @LoginMemberId Long memberId,
            @Valid @RequestBody CreateRoomRequest request
    ) {
        CreateRoomResponse response = roomCommandService.createRoom(memberId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{roomId}/members")
    public ResponseEntity<List<RoomMemberResponse>> getRoomMembers(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId
    ) {
        List<RoomMemberResponse> responses = roomReadService.getRoomMembers(memberId, roomId);
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{roomId}")
    public ResponseEntity<Void> deleteRoom(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId
    ) {
        roomCommandService.deleteRoom(memberId, roomId);
        return ResponseEntity.noContent().build();
    }
}
