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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Gender gender;

    @Column(nullable = false)
    private long point;

    @Column(name = "onboarding_completed", nullable = false)
    private boolean onboardingCompleted;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider")
    private AuthProvider provider;

    @Column(name = "fcm_token")
    private String fcmToken;

    @Builder
    private Member(String email, String password, String nickname, Region region, Gender gender, long point,
            boolean onboardingCompleted, Role role, AuthProvider provider) {
        this.email = email;
        this.password = password;
        this.nickname = nickname;
        this.region = region;
        this.gender = gender;
        this.point = point;
        this.onboardingCompleted = onboardingCompleted;
        this.role = role;
        this.provider = provider;
    }

    public static Member create(String email, String encodedPassword, String nickname) {
        return create(email, encodedPassword, nickname, null, Gender.MALE);
    }

    public static Member create(String email, String encodedPassword, String nickname, Region region) {
        return create(email, encodedPassword, nickname, region, Gender.MALE);
    }

    public static Member create(String email, String encodedPassword, String nickname, Region region, Gender gender) {
        return Member.builder()
                .email(email)
                .password(encodedPassword)
                .nickname(nickname)
                .region(region)
                .gender(gender)
                .role(Role.USER)
                .provider(AuthProvider.LOCAL)
                .build();
    }

    public static Member createSocial(String email, String nickname, AuthProvider provider) {
        return createSocial(email, nickname, provider, Gender.MALE);
    }

    public static Member createSocial(String email, String nickname, AuthProvider provider, Gender gender) {
        return Member.builder()
                .email(email)
                .nickname(nickname)
                .gender(gender)
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

    public void changeGender(Gender gender) {
        this.gender = gender;
    }

    public void changePassword(String encodedPassword) {
        this.password = encodedPassword;
    }

    public void deductPoint(long amount) {
        if (point < amount) {
            throw new CustomException(ErrorCode.INSUFFICIENT_POINT);
        }
        point -= amount;
    }

    public void addPoint(long amount) {
        point += amount;
    }

    public void updateFcmToken(String fcmToken) {
        this.fcmToken = fcmToken;
    }

    public void clearFcmToken() {
        this.fcmToken = null;
    }

}
