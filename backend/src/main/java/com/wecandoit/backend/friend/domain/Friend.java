package com.wecandoit.backend.friend.domain;

import com.wecandoit.backend.common.entity.BaseEntity;
import com.wecandoit.backend.domain.member.Member;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "friends",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_friends_member1_member2",
                columnNames = {"member1_id", "member2_id"}
        )
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Friend extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member1_id", nullable = false)
    private Member member1;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member2_id", nullable = false)
    private Member member2;

    private Friend(Member member1, Member member2) {
        if (member1.getId() < member2.getId()) {
            this.member1 = member1;
            this.member2 = member2;
            return;
        }
        this.member1 = member2;
        this.member2 = member1;
    }

    public static Friend create(Member firstMember, Member secondMember) {
        return new Friend(firstMember, secondMember);
    }

    public Member getFriendOf(Long memberId) {
        if (member1.getId().equals(memberId)) {
            return member2;
        }
        return member1;
    }
}
