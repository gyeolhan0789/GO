package com.wecandoit.cash.controller;

import com.wecandoit.cash.controller.response.CashHistoryResponse;
import com.wecandoit.cash.service.CashHistoryReadService;
import com.wecandoit.common.security.LoginMemberId;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/members/cash-histories")
@RequiredArgsConstructor
public class CashHistoryController {

    private final CashHistoryReadService cashHistoryReadService;

    @GetMapping
    public ResponseEntity<List<CashHistoryResponse>> getCashHistories(@LoginMemberId Long memberId) {
        return ResponseEntity.ok(cashHistoryReadService.getCashHistories(memberId));
    }
}
