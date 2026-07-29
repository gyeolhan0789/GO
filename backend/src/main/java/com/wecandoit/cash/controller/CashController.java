package com.wecandoit.cash.controller;

import com.wecandoit.cash.controller.response.CashResponse;
import com.wecandoit.cash.service.CashReadService;
import com.wecandoit.common.security.LoginMemberId;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/members/cash")
@RequiredArgsConstructor
public class CashController {

    private final CashReadService cashReadService;

    @GetMapping
    public ResponseEntity<CashResponse> getCash(@LoginMemberId Long memberId) {
        return ResponseEntity.ok(cashReadService.getCash(memberId));
    }
}
