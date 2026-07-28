package com.wecandoit.friend.controller;

import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.friend.dto.FriendResponse;
import com.wecandoit.friend.service.FriendCommandService;
import com.wecandoit.friend.service.FriendReadService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
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
    public ResponseEntity<SliceResponse<FriendResponse>> getFriends(
            @LoginMemberId Long memberId,
            Pageable pageable
    ) {
        return ResponseEntity.ok(friendReadService.getFriends(memberId, pageable));
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
