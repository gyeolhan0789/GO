package com.wecandoit.member.controller;

import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.member.controller.request.FcmTokenUpdateRequest;
import com.wecandoit.member.controller.request.MemberProfileUpdateRequest;
import com.wecandoit.member.controller.request.PasswordChangeRequest;
import com.wecandoit.member.controller.response.MemberSearchResponse;
import com.wecandoit.member.controller.response.MyPageResponse;
import com.wecandoit.member.service.MemberReadService;
import com.wecandoit.member.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberReadService memberReadService;
    private final MemberService memberService;

    @GetMapping("/me")
    public ResponseEntity<MyPageResponse> getMyPage(@LoginMemberId Long memberId) {
        return ResponseEntity.ok(memberReadService.getMyPage(memberId));
    }

    @GetMapping("/search")
    public ResponseEntity<SliceResponse<MemberSearchResponse>> searchMembers(
            @LoginMemberId Long memberId,
            @RequestParam(defaultValue = "") String keyword,
            Pageable pageable
    ) {
        return ResponseEntity.ok(memberReadService.searchMembers(memberId, keyword, pageable));
    }

    @PatchMapping("/me")
    public ResponseEntity<Void> updateProfile(
            @LoginMemberId Long memberId,
            @Valid @RequestBody MemberProfileUpdateRequest request
    ) {
        memberService.updateProfile(memberId, request);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/password")
    public ResponseEntity<Void> changePassword(
            @LoginMemberId Long memberId,
            @Valid @RequestBody PasswordChangeRequest request
    ) {
        memberService.changePassword(memberId, request);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/me/fcm-token")
    public ResponseEntity<Void> updateFcmToken(
            @LoginMemberId Long memberId,
            @Valid @RequestBody FcmTokenUpdateRequest request
    ) {
        memberService.updateFcmToken(memberId, request);
        return ResponseEntity.noContent().build();
    }
}
