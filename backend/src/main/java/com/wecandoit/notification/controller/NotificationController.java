package com.wecandoit.notification.controller;

import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.common.security.LoginMemberId;
import com.wecandoit.notification.dto.NotificationResponse;
import com.wecandoit.notification.service.NotificationCommandService;
import com.wecandoit.notification.service.NotificationReadService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationReadService notificationReadService;
    private final NotificationCommandService notificationCommandService;

    @GetMapping
    public ResponseEntity<SliceResponse<NotificationResponse>> getNotifications(
            @LoginMemberId Long memberId,
            Pageable pageable
    ) {
        return ResponseEntity.ok(notificationReadService.getNotifications(memberId, pageable));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Void> markAsRead(
            @LoginMemberId Long memberId,
            @PathVariable Long notificationId
    ) {
        notificationCommandService.markAsRead(memberId, notificationId);
        return ResponseEntity.noContent().build();
    }
}
