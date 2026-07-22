package com.wecandoit.game.request.controller;

import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.game.request.controller.request.GameRequestCreateRequest;
import com.wecandoit.game.request.controller.response.GameRequestCreateResponse;
import com.wecandoit.game.request.service.GameRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/rooms")
@RequiredArgsConstructor
public class GameRequestController {

    private final GameRequestService gameRequestService;

    @PostMapping("/{roomId}/requests")
    public ResponseEntity<GameRequestCreateResponse> createGameRequest(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId,
            @Valid @RequestBody GameRequestCreateRequest request
    ) {
        GameRequestCreateResponse response = gameRequestService.createGameRequest(
                memberId,
                roomId,
                request
        );
        HttpStatus status = response.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(response);
    }
}
