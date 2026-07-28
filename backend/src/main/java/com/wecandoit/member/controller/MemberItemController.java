package com.wecandoit.member.controller;

import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.item.controller.response.MemberItemResponse;
import com.wecandoit.item.service.CharacterItemReadService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/members/items")
@RequiredArgsConstructor
public class MemberItemController {

    private final CharacterItemReadService characterItemReadService;

    @GetMapping
    public ResponseEntity<List<MemberItemResponse>> getMyItems(
            @LoginMemberId Long memberId,
            @RequestParam(required = false) String category
    ) {
        return ResponseEntity.ok(characterItemReadService.getMyItems(memberId, category));
    }
}
