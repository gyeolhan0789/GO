package com.wecandoit.point.controller;

import com.wecandoit.point.controller.response.PointHistoryResponse;
import com.wecandoit.point.service.PointHistoryReadService;
import com.wecandoit.common.security.LoginMemberId;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/members/point-histories")
@RequiredArgsConstructor
public class PointHistoryController {

    private final PointHistoryReadService pointHistoryReadService;

    @GetMapping
    public ResponseEntity<List<PointHistoryResponse>> getPointHistories(@LoginMemberId Long memberId) {
        return ResponseEntity.ok(pointHistoryReadService.getPointHistories(memberId));
    }
}
