package com.wecandoit.notification.repository;

import com.wecandoit.notification.domain.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Slice<Notification> findAllByMemberIdOrderByCreatedAtDescIdDesc(Long memberId, Pageable pageable);
}
