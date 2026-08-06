package com.wecandoit.notification.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.notification.client.FcmClient;
import com.wecandoit.notification.domain.Notification;
import com.wecandoit.notification.domain.NotificationType;
import com.wecandoit.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationCommandService {

    private final NotificationRepository notificationRepository;
    private final MemberRepository memberRepository;
    private final FcmClient fcmClient;

    public void send(Long memberId, NotificationType type, String title, String body, Long targetId) {
        Member member = memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        notificationRepository.save(Notification.create(memberId, type, title, body, targetId));

        if (member.getFcmToken() == null) {
            return;
        }

        boolean invalidToken = fcmClient.send(member.getFcmToken(), title, body, type, targetId);
        if (invalidToken) {
            member.clearFcmToken();
        }
    }

    public void markAsRead(Long memberId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOTIFICATION_NOT_FOUND));

        if (!notification.getMemberId().equals(memberId)) {
            throw new CustomException(ErrorCode.NOTIFICATION_ACCESS_FORBIDDEN);
        }

        notification.markAsRead();
    }
}
