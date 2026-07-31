package com.wecandoit.notification.repository;

import com.wecandoit.notification.domain.Notification;
import com.wecandoit.notification.domain.NotificationType;
import java.time.LocalDateTime;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Slice<Notification> findAllByMemberIdOrderByCreatedAtDescIdDesc(Long memberId, Pageable pageable);

    boolean existsByMemberIdAndTypeAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            Long memberId,
            NotificationType type,
            LocalDateTime startInclusive,
            LocalDateTime endExclusive
    );
}
