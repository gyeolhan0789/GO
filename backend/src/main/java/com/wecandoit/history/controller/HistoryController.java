package com.wecandoit.history.controller;

import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.history.controller.request.HistorySaveRequest;
import com.wecandoit.history.controller.response.HistoryResponse;
import com.wecandoit.history.domain.HistoryPeriod;
import com.wecandoit.history.service.HistoryCommandService;
import com.wecandoit.history.service.HistoryReadService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/histories")
@RequiredArgsConstructor
public class HistoryController {

    private final HistoryCommandService historyCommandService;
    private final HistoryReadService historyReadService;

    @GetMapping
    public ResponseEntity<HistoryResponse> getHistories(
            @LoginMemberId Long memberId,
            @RequestParam HistoryPeriod period,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        HistoryResponse response = historyReadService.getHistories(memberId, period, date);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Void> saveHistory(
            @LoginMemberId Long memberId,
            @Valid @RequestBody HistorySaveRequest request
    ) {
        historyCommandService.saveHistory(memberId, request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
