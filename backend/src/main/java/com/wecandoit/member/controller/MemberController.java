package com.wecandoit.member.controller;

import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.member.dto.MemberSearchResponse;
import com.wecandoit.member.service.MemberReadService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberReadService memberReadService;

    @GetMapping("/search")
    public ResponseEntity<List<MemberSearchResponse>> searchMembers(
            @LoginMemberId Long memberId,
            @RequestParam(defaultValue = "") String keyword
    ) {
        return ResponseEntity.ok(memberReadService.searchMembers(memberId, keyword));
    }
}
