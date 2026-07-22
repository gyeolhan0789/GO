package com.wecandoit.game.request.controller;

import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.game.request.controller.request.GameRequestCreateRequest;
import com.wecandoit.game.request.controller.response.GameRequestCreateResponse;
import com.wecandoit.game.request.controller.response.ReceivedGameRequestResponse;
import com.wecandoit.game.request.service.GameRequestCommandService;
import com.wecandoit.game.request.service.GameRequestReadService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/rooms")
@RequiredArgsConstructor
public class GameRequestController {

    private final GameRequestCommandService gameRequestCommandService;
    private final GameRequestReadService gameRequestReadService;

    @GetMapping("/requests/received")
    public ResponseEntity<List<ReceivedGameRequestResponse>> getReceivedGameRequests(
            @LoginMemberId Long memberId
    ) {
        return ResponseEntity.ok(gameRequestReadService.getReceivedGameRequests(memberId));
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
