package com.wecandoit.member.controller;

import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.item.controller.response.CharacterResponse;
import com.wecandoit.item.service.CharacterItemQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/members/character")
@RequiredArgsConstructor
public class MemberCharacterController {

    private final CharacterItemQueryService characterItemQueryService;

    @GetMapping
    public ResponseEntity<CharacterResponse> getMyCharacter(@LoginMemberId Long memberId) {
        return ResponseEntity.ok(characterItemQueryService.getMyCharacter(memberId));
    }
}
