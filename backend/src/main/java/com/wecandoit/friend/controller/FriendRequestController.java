package com.wecandoit.friend.controller;

import com.wecandoit.common.response.PageResponse;
import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.friend.dto.ReceivedFriendRequestResponse;
import com.wecandoit.friend.dto.SendFriendRequest;
import com.wecandoit.friend.dto.SentFriendRequestResponse;
import com.wecandoit.friend.service.FriendRequestCommandService;
import com.wecandoit.friend.service.FriendRequestReadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/friend-requests")
@RequiredArgsConstructor
public class FriendRequestController {

    private final FriendRequestReadService friendRequestReadService;
    private final FriendRequestCommandService friendRequestCommandService;

    @PostMapping
    public ResponseEntity<Void> sendRequest(
            @LoginMemberId Long memberId,
            @Valid @RequestBody SendFriendRequest request
    ) {
        friendRequestCommandService.sendRequest(memberId, request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping
    public ResponseEntity<PageResponse<ReceivedFriendRequestResponse>> getReceivedRequests(
            @LoginMemberId Long memberId,
            Pageable pageable
    ) {
        return ResponseEntity.ok(friendRequestReadService.getReceivedRequests(memberId, pageable));
    }

    @GetMapping("/sent")
    public ResponseEntity<PageResponse<SentFriendRequestResponse>> getSentRequests(
            @LoginMemberId Long memberId,
            Pageable pageable
    ) {
        return ResponseEntity.ok(friendRequestReadService.getSentRequests(memberId, pageable));
    }

    @DeleteMapping("/{requestId}")
    public ResponseEntity<Void> cancelRequest(
            @LoginMemberId Long memberId,
            @PathVariable Long requestId
    ) {
        friendRequestCommandService.cancelRequest(memberId, requestId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{requestId}/accept")
    public ResponseEntity<Void> acceptRequest(
            @LoginMemberId Long memberId,
            @PathVariable Long requestId
    ) {
        friendRequestCommandService.acceptRequest(memberId, requestId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{requestId}/reject")
    public ResponseEntity<Void> rejectRequest(
            @LoginMemberId Long memberId,
            @PathVariable Long requestId
    ) {
        friendRequestCommandService.rejectRequest(memberId, requestId);
        return ResponseEntity.noContent().build();
    }
}
