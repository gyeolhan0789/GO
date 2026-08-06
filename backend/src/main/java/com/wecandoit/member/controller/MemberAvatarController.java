package com.wecandoit.member.controller;

import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.avatar.dto.AvatarDto;
import com.wecandoit.item.service.AvatarItemReadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/members/avatar")
@RequiredArgsConstructor
public class MemberAvatarController {

    private final AvatarItemReadService avatarItemReadService;

    @GetMapping
    public ResponseEntity<AvatarDto> getMyAvatar(@LoginMemberId Long memberId) {
        return ResponseEntity.ok(avatarItemReadService.getMyAvatar(memberId));
    }
}
