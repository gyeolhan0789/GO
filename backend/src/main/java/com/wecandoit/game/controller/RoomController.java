package com.wecandoit.game.controller;

import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.game.controller.request.CreateRoomRequest;
import com.wecandoit.game.controller.response.CreateRoomResponse;
import com.wecandoit.game.controller.response.MyRoomResponse;
import com.wecandoit.game.controller.response.RoomDetailResponse;
import com.wecandoit.game.controller.response.RoomMemberResponse;
import com.wecandoit.game.service.RoomCommandService;
import com.wecandoit.game.service.RoomReadService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
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

    @GetMapping("/{roomId}")
    public ResponseEntity<RoomDetailResponse> getRoomDetail(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId
    ) {
        RoomDetailResponse response = roomReadService.getRoomDetail(memberId, roomId);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<RoomDetailResponse> createRoom(
            @LoginMemberId Long memberId,
            @Valid @RequestBody CreateRoomRequest request
    ) {
        CreateRoomResponse response = roomCommandService.createRoom(memberId, request);
        RoomDetailResponse roomDetail = roomReadService.getRoomDetail(memberId, response.roomId());
        return ResponseEntity.ok(roomDetail);
    }

    @GetMapping("/{roomId}/members")
    public ResponseEntity<List<RoomMemberResponse>> getRoomMembers(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId
    ) {
        List<RoomMemberResponse> responses = roomReadService.getRoomMembers(memberId, roomId);
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/{roomId}/start")
    public ResponseEntity<RoomDetailResponse> startGame(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId
    ) {
        roomCommandService.startGame(memberId, roomId);
        RoomDetailResponse response = roomReadService.getRoomDetail(memberId, roomId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{roomId}/members/me")
    public ResponseEntity<Void> leaveRoom(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId
    ) {
        roomCommandService.leaveRoom(memberId, roomId);
        return ResponseEntity.noContent().build();
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
