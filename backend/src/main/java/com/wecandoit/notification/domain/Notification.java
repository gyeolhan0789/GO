package com.wecandoit.notification.domain;

import com.wecandoit.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "notification")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String body;

    @Column(name = "is_read", nullable = false)
    private boolean read;

    @Builder
    private Notification(Long memberId, NotificationType type, String title, String body) {
        this.memberId = memberId;
        this.type = type;
        this.title = title;
        this.body = body;
        this.read = false;
    }

    public static Notification create(Long memberId, NotificationType type, String title, String body) {
        return Notification.builder()
                .memberId(memberId)
                .type(type)
                .title(title)
                .body(body)
                .build();
    }

    public void markAsRead() {
        this.read = true;
    }
}
