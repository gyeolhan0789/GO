package com.wecandoit.history.controller;

import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.history.controller.request.HistorySaveRequest;
import com.wecandoit.history.service.HistoryCommandService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/histories")
@RequiredArgsConstructor
public class HistoryController {

    private final HistoryCommandService historyCommandService;

    @PostMapping
    public ResponseEntity<Void> saveHistory(
            @LoginMemberId Long memberId,
            @Valid @RequestBody HistorySaveRequest request
    ) {
        historyCommandService.saveHistory(memberId, request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
