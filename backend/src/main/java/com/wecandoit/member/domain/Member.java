package com.wecandoit.member.domain;

import com.wecandoit.common.entity.BaseEntity;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
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
@Table(name = "member")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column
    private String password;

    @Column(nullable = false, unique = true, length = 50)
    private String nickname;

    @Enumerated(EnumType.STRING)
    @Column(length = 100)
    private Region region;

    @Column(nullable = false)
    private long cash;

    @Column(name = "onboarding_completed", nullable = false)
    private boolean onboardingCompleted;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider")
    private AuthProvider provider;

    @Builder
    private Member(String email, String password, String nickname, Region region, long cash,
            boolean onboardingCompleted, Role role, AuthProvider provider) {
        this.email = email;
        this.password = password;
        this.nickname = nickname;
        this.region = region;
        this.cash = cash;
        this.onboardingCompleted = onboardingCompleted;
        this.role = role;
        this.provider = provider;
    }

    public static Member create(String email, String encodedPassword, String nickname) {
        return create(email, encodedPassword, nickname, null);
    }

    public static Member create(String email, String encodedPassword, String nickname, Region region) {
        return Member.builder()
                .email(email)
                .password(encodedPassword)
                .nickname(nickname)
                .region(region)
                .role(Role.USER)
                .provider(AuthProvider.LOCAL)
                .build();
    }

    public static Member createSocial(String email, String nickname, AuthProvider provider) {
        return Member.builder()
                .email(email)
                .nickname(nickname)
                .role(Role.USER)
                .provider(provider)
                .build();
    }

    public void changeNickname(String nickname) {
        this.nickname = nickname;
    }

    public void changeRegion(Region region) {
        this.region = region;
    }

    public void changePassword(String encodedPassword) {
        this.password = encodedPassword;
    }

    public void deductCash(long amount) {
        if (cash < amount) {
            throw new CustomException(ErrorCode.INSUFFICIENT_CASH);
        }
        cash -= amount;
    }

    public void addCash(long amount) {
        cash += amount;
    }

}
