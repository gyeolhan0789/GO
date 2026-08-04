package com.wecandoit.history.controller;

import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.history.controller.request.WalkSessionCompleteRequest;
import com.wecandoit.history.controller.request.WalkSessionStartRequest;
import com.wecandoit.history.controller.response.WalkSessionDetailResponse;
import com.wecandoit.history.controller.response.WalkSessionResponse;
import com.wecandoit.history.controller.response.WalkSessionStartResponse;
import com.wecandoit.history.service.WalkSessionCommandService;
import com.wecandoit.history.service.WalkSessionCommandService.CompletionResult;
import com.wecandoit.history.service.WalkSessionCommandService.StartResult;
import com.wecandoit.history.service.WalkSessionReadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/walk-sessions")
@RequiredArgsConstructor
public class WalkSessionController {

    private final WalkSessionCommandService walkSessionCommandService;
    private final WalkSessionReadService walkSessionReadService;

    @PostMapping("/start")
    public ResponseEntity<WalkSessionStartResponse> startSession(
            @LoginMemberId Long memberId,
            @Valid @RequestBody WalkSessionStartRequest request
    ) {
        StartResult result = walkSessionCommandService.startSession(memberId, request);
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(result.response());
    }

    @PostMapping
    public ResponseEntity<WalkSessionResponse> completeSession(
            @LoginMemberId Long memberId,
            @Valid @RequestBody WalkSessionCompleteRequest request
    ) {
        CompletionResult result = walkSessionCommandService.completeSession(memberId, request);
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(result.response());
    }

    @GetMapping
    public ResponseEntity<SliceResponse<WalkSessionResponse>> getWalkSessions(
            @LoginMemberId Long memberId,
            @RequestParam(required = false) Long roomId,
            Pageable pageable
    ) {
        return ResponseEntity.ok(walkSessionReadService.getWalkSessions(memberId, roomId, pageable));
    }

    @GetMapping("/{walkSessionId}")
    public ResponseEntity<WalkSessionDetailResponse> getWalkSession(
            @LoginMemberId Long memberId,
            @PathVariable Long walkSessionId
    ) {
        return ResponseEntity.ok(walkSessionReadService.getWalkSession(memberId, walkSessionId));
    }
}
