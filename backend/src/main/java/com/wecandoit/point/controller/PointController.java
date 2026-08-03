package com.wecandoit.point.controller;

import com.wecandoit.point.controller.response.PointResponse;
import com.wecandoit.point.service.PointReadService;
import com.wecandoit.common.security.LoginMemberId;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/members/point")
@RequiredArgsConstructor
public class PointController {

    private final PointReadService pointReadService;

    @GetMapping
    public ResponseEntity<PointResponse> getPoint(@LoginMemberId Long memberId) {
        return ResponseEntity.ok(pointReadService.getPoint(memberId));
    }
}
