package com.wecandoit.game.controller;

import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.game.controller.response.GameResultDetailResponse;
import com.wecandoit.game.controller.response.GameResultResponse;
import com.wecandoit.game.service.GameResultReadService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/game-results")
@RequiredArgsConstructor
public class GameResultController {

    private final GameResultReadService gameResultReadService;

    @GetMapping("/{gameId}")
    public ResponseEntity<GameResultDetailResponse> getGameResult(
            @LoginMemberId Long memberId,
            @PathVariable Long gameId
    ) {
        GameResultDetailResponse response = gameResultReadService.getGameResult(memberId, gameId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<SliceResponse<GameResultResponse>> getMyGameResults(
            @LoginMemberId Long memberId,
            Pageable pageable
    ) {
        SliceResponse<GameResultResponse> response = gameResultReadService.getMyGameResults(memberId, pageable);
        return ResponseEntity.ok(response);
    }
}
