package com.wecandoit.friend.domain;

import com.wecandoit.common.entity.BaseEntity;
import com.wecandoit.member.domain.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "friend_requests")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FriendRequest extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inviter_id", nullable = false)
    private Member inviter;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invitee_id", nullable = false)
    private Member invitee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FriendRequestStatus status;

    private FriendRequest(Member inviter, Member invitee) {
        this.inviter = inviter;
        this.invitee = invitee;
        this.status = FriendRequestStatus.PENDING;
    }

    public static FriendRequest create(Member inviter, Member invitee) {
        return new FriendRequest(inviter, invitee);
    }

    public void accept() {
        status = FriendRequestStatus.ACCEPTED;
    }

    public void reject() {
        status = FriendRequestStatus.REJECTED;
    }

    public boolean isPending() {
        return status == FriendRequestStatus.PENDING;
    }

    public boolean isInvitee(Long memberId) {
        return invitee.getId().equals(memberId);
    }

    public boolean isInviter(Long memberId) {
        return inviter.getId().equals(memberId);
    }
}
