package com.wecandoit.game.controller;

import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.game.controller.request.CreateRoomRequest;
import com.wecandoit.game.controller.request.GameRequestCreateRequest;
import com.wecandoit.game.controller.request.UpdateRoomNameRequest;
import com.wecandoit.game.controller.response.GameRequestCreateResponse;
import com.wecandoit.game.controller.response.MyRoomResponse;
import com.wecandoit.game.controller.response.ReceivedGameRequestResponse;
import com.wecandoit.game.controller.response.RoomDetailResponse;
import com.wecandoit.game.controller.response.RoomMemberResponse;
import com.wecandoit.game.controller.response.SentGameRequestResponse;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.service.GameRequestCommandService;
import com.wecandoit.game.service.GameRequestReadService;
import com.wecandoit.game.service.RoomCommandService;
import com.wecandoit.game.service.RoomCreateFacade;
import com.wecandoit.game.service.RoomReadService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomCommandService roomCommandService;
    private final RoomReadService roomReadService;
    private final RoomCreateFacade roomCreateFacade;
    private final GameRequestCommandService gameRequestCommandService;
    private final GameRequestReadService gameRequestReadService;

    @GetMapping
    public ResponseEntity<List<MyRoomResponse>> getMyRooms(
            @LoginMemberId Long memberId,
            @RequestParam(required = false) GameMode mode
    ) {
        List<MyRoomResponse> responses = roomReadService.getMyRooms(memberId, mode);
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
        RoomDetailResponse roomDetail = roomCreateFacade.createRoom(memberId, request);
        return ResponseEntity.ok(roomDetail);
    }

    @PatchMapping("/{roomId}")
    public ResponseEntity<Void> updateRoomName(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId,
            @Valid @RequestBody UpdateRoomNameRequest request
    ) {
        roomCommandService.updateRoomName(memberId, roomId, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{roomId}/members")
    public ResponseEntity<List<RoomMemberResponse>> getRoomMembers(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId
    ) {
        List<RoomMemberResponse> responses = roomReadService.getRoomMembers(memberId, roomId);
        return ResponseEntity.ok(responses);
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

    @GetMapping("/requests/received")
    public ResponseEntity<List<ReceivedGameRequestResponse>> getReceivedGameRequests(
            @LoginMemberId Long memberId
    ) {
        return ResponseEntity.ok(gameRequestReadService.getReceivedGameRequests(memberId));
    }

    @GetMapping("/requests/sent")
    public ResponseEntity<List<SentGameRequestResponse>> getSentGameRequests(
            @LoginMemberId Long memberId
    ) {
        return ResponseEntity.ok(gameRequestReadService.getSentGameRequests(memberId));
    }

    @PostMapping("/{roomId}/requests")
    public ResponseEntity<GameRequestCreateResponse> createGameRequest(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId,
            @Valid @RequestBody GameRequestCreateRequest request
    ) {
        GameRequestCreateResponse response = gameRequestCommandService.createGameRequest(
                memberId,
                roomId,
                request
        );
        HttpStatus status = response.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(response);
    }

    @PatchMapping("/{roomId}/requests/{requestId}/accept")
    public ResponseEntity<Void> acceptGameRequest(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId,
            @PathVariable Long requestId
    ) {
        gameRequestCommandService.acceptGameRequest(memberId, roomId, requestId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{roomId}/requests/{requestId}/reject")
    public ResponseEntity<Void> rejectGameRequest(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId,
            @PathVariable Long requestId
    ) {
        gameRequestCommandService.rejectGameRequest(memberId, roomId, requestId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{roomId}/requests/{requestId}/cancel")
    public ResponseEntity<Void> cancelGameRequest(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId,
            @PathVariable Long requestId
    ) {
        gameRequestCommandService.cancelGameRequest(memberId, roomId, requestId);
        return ResponseEntity.noContent().build();
    }
}
