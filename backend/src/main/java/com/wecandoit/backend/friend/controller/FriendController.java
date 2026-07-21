package com.wecandoit.backend.friend.controller;

import com.wecandoit.backend.friend.service.FriendCommandService;
import com.wecandoit.backend.friend.service.FriendReadService;

import com.wecandoit.backend.common.security.LoginMemberId;
import com.wecandoit.backend.friend.dto.FriendResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/friends")
@RequiredArgsConstructor
public class FriendController {

    private final FriendReadService friendReadService;
    private final FriendCommandService friendCommandService;

    @GetMapping
    public ResponseEntity<List<FriendResponse>> getFriends(@LoginMemberId Long memberId) {
        return ResponseEntity.ok(friendReadService.getFriends(memberId));
    }

    @DeleteMapping("/{friendId}")
    public ResponseEntity<Void> deleteFriend(
            @LoginMemberId Long memberId,
            @PathVariable Long friendId
    ) {
        friendCommandService.deleteFriend(memberId, friendId);
        return ResponseEntity.noContent().build();
    }
}
