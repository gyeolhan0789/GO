package com.wecandoit.notification.service;

import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.notification.dto.NotificationResponse;
import com.wecandoit.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationReadService {

    private final NotificationRepository notificationRepository;

    public SliceResponse<NotificationResponse> getNotifications(Long memberId, Pageable pageable) {
        Pageable fixedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Slice<NotificationResponse> notifications = notificationRepository
                .findAllByMemberIdOrderByCreatedAtDescIdDesc(memberId, fixedPageable)
                .map(NotificationResponse::from);
        return SliceResponse.from(notifications);
    }
}
