package com.wecandoit.bingo.controller;

import com.wecandoit.bingo.controller.request.SubmitBingoCellRequest;
import com.wecandoit.bingo.controller.response.BingoBoardResponse;
import com.wecandoit.bingo.controller.response.BingoCellResponse;
import com.wecandoit.bingo.service.BingoService;
import com.wecandoit.bingo.service.MissionVerificationFacade;
import com.wecandoit.common.security.LoginMemberId;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/rooms")
@RequiredArgsConstructor
public class BingoController {

    private final BingoService bingoService;
    private final MissionVerificationFacade missionVerificationFacade;

    @GetMapping("/{roomId}/bingo-boards/active")
    public ResponseEntity<BingoBoardResponse> getActiveBoard(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId
    ) {
        BingoBoardResponse response = bingoService.getActiveBoard(memberId, roomId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{roomId}/bingo-boards/cells/{cellId}/submit")
    public ResponseEntity<BingoCellResponse> submitCell(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId,
            @PathVariable Long cellId,
            @Valid @RequestBody SubmitBingoCellRequest request
    ) {
        BingoCellResponse response = missionVerificationFacade.submitAndVerify(
                memberId, roomId, cellId, request.submitUrl());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{roomId}/bingo-boards/renewal")
    public ResponseEntity<BingoBoardResponse> renewBoard(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId
    ) {
        BingoBoardResponse response = bingoService.renewBoard(memberId, roomId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
