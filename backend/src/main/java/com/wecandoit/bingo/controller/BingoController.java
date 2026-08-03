package com.wecandoit.bingo.controller;

import com.wecandoit.bingo.controller.request.RenewBingoBoardRequest;
import com.wecandoit.bingo.controller.response.BingoBoardResponse;
import com.wecandoit.bingo.controller.response.BingoCellSubmitResponse;
import com.wecandoit.bingo.service.BingoCommandService;
import com.wecandoit.bingo.service.BingoReadService;
import com.wecandoit.bingo.service.MissionVerificationFacade;
import com.wecandoit.common.security.LoginMemberId;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/rooms")
@RequiredArgsConstructor
public class BingoController {

    private final BingoCommandService bingoCommandService;
    private final BingoReadService bingoReadService;
    private final MissionVerificationFacade missionVerificationFacade;

    @GetMapping("/{roomId}/bingo-boards/active")
    public ResponseEntity<BingoBoardResponse> getActiveBoard(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId
    ) {
        BingoBoardResponse response = bingoReadService.getActiveBoard(memberId, roomId);
        return ResponseEntity.ok(response);
    }

    @PostMapping(
            value = "/{roomId}/bingo-boards/cells/{cellId}/submit",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<BingoCellSubmitResponse> submitCell(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId,
            @PathVariable Long cellId,
            @RequestPart("image") MultipartFile image
    ) {
        BingoCellSubmitResponse response = missionVerificationFacade.submitAndVerify(memberId, roomId, cellId, image);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{roomId}/bingo-boards/renewal")
    public ResponseEntity<BingoBoardResponse> renewBoard(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId,
            @Valid @RequestBody RenewBingoBoardRequest request
    ) {
        BingoBoardResponse response = bingoCommandService.renewBoard(
                memberId,
                roomId,
                request.boardSize(),
                request.targetStepCount()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{roomId}/battles/rematch")
    public ResponseEntity<BingoBoardResponse> rematchBattle(
            @LoginMemberId Long memberId,
            @PathVariable Long roomId
    ) {
        bingoCommandService.rematchBattle(memberId, roomId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bingoReadService.getActiveBoard(memberId, roomId));
    }
}
